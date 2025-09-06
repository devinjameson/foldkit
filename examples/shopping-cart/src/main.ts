import { Data, Effect, Option, pipe, Schema } from 'effect'
import { Route, Fold, Runtime } from '@foldkit'
import { Class, Html, Href, div, h1, p, a } from '@foldkit/html'
import { pushUrl, load } from '@foldkit/navigation'
import { literal } from '@foldkit/route'

import { products } from './data/products'
import { Products, Cart as CartPage, Checkout } from './page'
import { Cart } from './domain'

// ROUTE

export type AppRoute = Data.TaggedEnum<{
  Products: { searchText: Option.Option<string> }
  Cart: {}
  Checkout: {}
  NotFound: { path: string }
}>

const AppRoute = Data.taggedEnum<AppRoute>()

const ProductsQuerySchema = Schema.Struct({
  searchText: Schema.OptionFromUndefinedOr(Schema.String),
})

const productsRouter = pipe(
  Route.default.root,
  Route.default.query(ProductsQuerySchema),
  Route.default.mapTo(AppRoute.Products),
)

const cartRouter = pipe(literal('cart'), Route.default.mapTo(AppRoute.Cart))

const checkoutRouter = pipe(literal('checkout'), Route.default.mapTo(AppRoute.Checkout))

const routeParser = Route.default.oneOf(checkoutRouter, cartRouter, productsRouter)

const urlToAppRoute = Route.default.parseUrlWithFallback(routeParser, AppRoute.NotFound)

// MODEL

type Model = Readonly<{
  route: AppRoute
  cart: Cart.Cart
  deliveryInstructions: string
  orderPlaced: boolean
  productsPage: Products.Model
}>

// MESSAGE

type Message = Data.TaggedEnum<{
  NoOp: {}
  UrlRequestReceived: { request: Runtime.UrlRequest }
  UrlChanged: { url: Runtime.Url }
  ProductsMessage: { message: Products.Message }
  CartMessage: { message: CartPage.Message }
  CheckoutMessage: { message: Checkout.Message }
}>

const Message = Data.taggedEnum<Message>()

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Runtime.Url) => {
  return [
    {
      route: urlToAppRoute(url),
      cart: [],
      deliveryInstructions: '',
      orderPlaced: false,
      productsPage: Products.init(products),
    },
    Option.none(),
  ]
}

// UPDATE

const { identity, pure, pureCommand } = Fold.updateConstructors<Model, Message>()

const update = Fold.fold<Model, Message>({
  NoOp: identity,

  UrlRequestReceived: pureCommand((model, { request }) =>
    Runtime.UrlRequest.$match(request, {
      Internal: ({ url }): [Model, Runtime.Command<Message>] => [
        {
          ...model,
          route: urlToAppRoute(url),
        },
        pushUrl(url.pathname).pipe(Effect.map(() => Message.NoOp())),
      ],

      External: ({ href }): [Model, Runtime.Command<Message>] => [
        model,
        load(href).pipe(Effect.map(() => Message.NoOp())),
      ],
    }),
  ),

  UrlChanged: pure((model, { url }) => ({
    ...model,
    route: urlToAppRoute(url),
  })),

  ProductsMessage: (model, { message }) => {
    const [newProductsModel, productsCommand] = Products.update(productsRouter)(
      model.productsPage,
      message,
    )

    const newModel = Products.Message.$match(message, {
      NoOp: () => ({
        ...model,
        productsPage: newProductsModel,
      }),

      SearchInputChanged: () => ({
        ...model,
        productsPage: newProductsModel,
      }),

      AddToCartClicked: ({ item }) => ({
        ...model,
        productsPage: newProductsModel,
        cart: Cart.addItem(item)(model.cart),
      }),

      QuantityChangeClicked: ({ itemId, quantity }) => ({
        ...model,
        productsPage: newProductsModel,
        cart: Cart.changeQuantity(itemId, quantity)(model.cart),
      }),
    })

    return [
      newModel,
      // TODO: Make Command.none and drop Option
      // TODO: Support batch commands
      Option.map(
        productsCommand,
        Runtime.Command.map((productsMessage) =>
          Message.ProductsMessage({ message: productsMessage }),
        ),
      ),
    ]
  },

  CartMessage: pure((model, { message }) =>
    CartPage.Message.$match(message, {
      ChangeQuantity: ({ itemId, quantity }) => ({
        ...model,
        cart: Cart.changeQuantity(itemId, quantity)(model.cart),
      }),

      RemoveFromCart: ({ itemId }) => ({
        ...model,
        cart: Cart.removeItem(itemId)(model.cart),
      }),

      ClearCart: () => ({
        ...model,
        cart: [],
      }),
    }),
  ),

  CheckoutMessage: pure((model, { message }) =>
    Checkout.Message.$match(message, {
      UpdateDeliveryInstructions: ({ value }) => ({
        ...model,
        deliveryInstructions: value,
      }),

      PlaceOrder: () => ({
        ...model,
        orderPlaced: true,
        cart: [],
        deliveryInstructions: '',
      }),
    }),
  ),
})

// VIEW

const navigationView = (currentRoute: AppRoute, cartCount: number): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-blue-600 font-medium px-3 py-1 rounded transition ${isActive ? 'bg-blue-700 bg-opacity-50' : ''}`

  return div(
    [Class('bg-blue-500 text-white p-4 mb-6')],
    [
      div(
        [Class('max-w-6xl mx-auto flex gap-6 justify-center')],
        [
          a(
            [
              Href(productsRouter.build({ searchText: Option.none() })),
              Class(navLinkClassName(AppRoute.$is('Products')(currentRoute))),
            ],
            ['Products'],
          ),
          a(
            [
              Href(cartRouter.build({})),
              Class(navLinkClassName(AppRoute.$is('Cart')(currentRoute))),
            ],
            cartCount > 0 ? [`Cart (${cartCount})`] : ['Cart'],
          ),
          a(
            [
              Href(checkoutRouter.build({})),
              Class(navLinkClassName(AppRoute.$is('Checkout')(currentRoute))),
            ],
            ['Checkout'],
          ),
        ],
      ),
    ],
  )
}

const productsView = (model: Model): Html => {
  return Products.view(model.productsPage, model.cart, cartRouter, (message) =>
    Message.ProductsMessage({ message }),
  )
}

const cartView = (model: Model): Html => {
  return CartPage.view(model.cart, productsRouter, checkoutRouter, (message) =>
    Message.CartMessage({ message }),
  )
}

const checkoutView = (model: Model): Html => {
  return Checkout.view(
    model.cart,
    model.deliveryInstructions,
    model.orderPlaced,
    productsRouter,
    cartRouter,
    (message) => Message.CheckoutMessage({ message }),
  )
}

const notFoundView = (path: string): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h1([Class('text-4xl font-bold text-red-600 mb-6')], ['404 - Page Not Found']),
      p([Class('text-lg text-gray-600 mb-4')], [`The path "${path}" was not found.`]),
      a(
        [
          Href(productsRouter.build({ searchText: Option.none() })),
          Class('text-blue-500 hover:underline'),
        ],
        ['← Go to Products'],
      ),
    ],
  )

const view = (model: Model): Html => {
  const routeContent = AppRoute.$match(model.route, {
    Products: () => productsView(model),
    Cart: () => cartView(model),
    Checkout: () => checkoutView(model),
    NotFound: ({ path }) => notFoundView(path),
  })

  return div(
    [Class('min-h-screen bg-gray-100')],
    [
      navigationView(model.route, Cart.totalItems(model.cart)),
      div([Class('py-8')], [routeContent]),
    ],
  )
}

// RUN

const app = Runtime.makeApplication({
  init,
  update,
  view,
  container: document.body,
  browser: {
    onUrlRequest: (request) => Message.UrlRequestReceived({ request }),
    onUrlChange: (url) => Message.UrlChanged({ url }),
  },
})

Effect.runFork(app)
