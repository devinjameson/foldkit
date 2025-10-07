import { Effect, Match, Option, Schema as S, pipe } from 'effect'
import { Fold, Route, Runtime } from 'foldkit'
import { Class, Href, Html, a, div, h1, p } from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { literal } from 'foldkit/route'
import { ST, ts } from 'foldkit/schema'
import { Url, UrlRequest } from 'foldkit/urlRequest'

import { products } from './data/products'
import { Cart, Item } from './domain'
import { Cart as CartPage, Checkout, Products } from './page'

// ROUTE

export const ProductsRoute = ts('Products', { searchText: S.Option(S.String) })
export const CartRoute = ts('Cart')
export const CheckoutRoute = ts('Checkout')
export const NotFoundRoute = ts('NotFound', { path: S.String })
export const AppRoute = S.Union(ProductsRoute, CartRoute, CheckoutRoute, NotFoundRoute)

export type ProductsRoute = ST<typeof ProductsRoute>
export type CartRoute = ST<typeof CartRoute>
export type CheckoutRoute = ST<typeof CheckoutRoute>
export type NotFoundRoute = ST<typeof NotFoundRoute>
export type AppRoute = ST<typeof AppRoute>

const productsRouter = pipe(
  Route.root,
  Route.query(S.Struct({ searchText: S.OptionFromUndefinedOr(S.String) })),
  Route.mapTo(ProductsRoute),
)
const cartRouter = pipe(literal('cart'), Route.mapTo(CartRoute))
const checkoutRouter = pipe(literal('checkout'), Route.mapTo(CheckoutRoute))

const routeParser = Route.oneOf(checkoutRouter, cartRouter, productsRouter)

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// MODEL

const Model = S.Struct({
  route: AppRoute,
  cart: Cart.Cart,
  deliveryInstructions: S.String,
  orderPlaced: S.Boolean,
  productsPage: Products.Model,
})
type Model = S.Schema.Type<typeof Model>

// MESSAGE

const NoOp = ts('NoOp')
const UrlRequestReceived = ts('UrlRequestReceived', { request: UrlRequest })
const UrlChanged = ts('UrlChanged', { url: Url })
const ProductsMessage = ts('ProductsMessage', { message: Products.Message })
const AddToCartClicked = ts('AddToCartClicked', { item: Item.Item })
const QuantityChangeClicked = ts('QuantityChangeClicked', { itemId: S.String, quantity: S.Number })
const ChangeCartQuantity = ts('ChangeCartQuantity', { itemId: S.String, quantity: S.Number })
const RemoveFromCart = ts('RemoveFromCart', { itemId: S.String })
const ClearCart = ts('ClearCart')
const UpdateDeliveryInstructions = ts('UpdateDeliveryInstructions', { value: S.String })
const PlaceOrder = ts('PlaceOrder')

export const Message = S.Union(
  NoOp,
  UrlRequestReceived,
  UrlChanged,
  ProductsMessage,
  AddToCartClicked,
  QuantityChangeClicked,
  ChangeCartQuantity,
  RemoveFromCart,
  ClearCart,
  UpdateDeliveryInstructions,
  PlaceOrder,
)

type NoOp = ST<typeof NoOp>
type UrlRequestReceived = ST<typeof UrlRequestReceived>
type UrlChanged = ST<typeof UrlChanged>
type ProductsMessage = ST<typeof ProductsMessage>
type AddToCartClicked = ST<typeof AddToCartClicked>
type QuantityChangeClicked = ST<typeof QuantityChangeClicked>
type ChangeCartQuantity = ST<typeof ChangeCartQuantity>
type RemoveFromCart = ST<typeof RemoveFromCart>
type ClearCart = ST<typeof ClearCart>
type UpdateDeliveryInstructions = ST<typeof UpdateDeliveryInstructions>
type PlaceOrder = ST<typeof PlaceOrder>

export type Message = ST<typeof Message>

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url) => {
  return [
    {
      route: urlToAppRoute(url),
      cart: [],
      deliveryInstructions: '',
      orderPlaced: false,
      productsPage: Products.init(products),
    },
    [],
  ]
}

// UPDATE

const update = Fold.fold<Model, Message>({
  NoOp: (model) => [model, []],

  UrlRequestReceived: (model, { request }) =>
    pipe(
      Match.value(request),
      Match.withReturnType<[Model, Runtime.Command<NoOp>[]]>(),
      Match.tagsExhaustive({
        Internal: ({ url }) => [
          {
            ...model,
            route: urlToAppRoute(url),
          },
          [pushUrl(url.pathname).pipe(Effect.as(NoOp.make()))],
        ],

        External: ({ href }) => [model, [load(href).pipe(Effect.as(NoOp.make()))]],
      }),
    ),

  UrlChanged: (model, { url }) => [
    {
      ...model,
      route: urlToAppRoute(url),
    },
    [],
  ],

  ProductsMessage: (model, { message }) => {
    const [newProductsModel, productsCommand] = Products.update(productsRouter)(
      model.productsPage,
      message,
    )

    return [
      {
        ...model,
        productsPage: newProductsModel,
      },
      productsCommand.map(
        Effect.map((productsMessage) => ProductsMessage.make({ message: productsMessage })),
      ),
    ]
  },

  AddToCartClicked: (model, { item }) => [
    {
      ...model,
      cart: Cart.addItem(item)(model.cart),
    },
    [],
  ],

  QuantityChangeClicked: (model, { itemId, quantity }) => [
    {
      ...model,
      cart: Cart.changeQuantity(itemId, quantity)(model.cart),
    },
    [],
  ],

  ChangeCartQuantity: (model, { itemId, quantity }) => [
    {
      ...model,
      cart: Cart.changeQuantity(itemId, quantity)(model.cart),
    },
    [],
  ],

  RemoveFromCart: (model, { itemId }) => [
    {
      ...model,
      cart: Cart.removeItem(itemId)(model.cart),
    },
    [],
  ],

  ClearCart: (model) => [
    {
      ...model,
      cart: [],
    },
    [],
  ],

  UpdateDeliveryInstructions: (model, { value }) => [
    {
      ...model,
      deliveryInstructions: value,
    },
    [],
  ],

  PlaceOrder: (model) => [
    {
      ...model,
      orderPlaced: true,
      cart: [],
      deliveryInstructions: '',
    },
    [],
  ],
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
              Class(navLinkClassName(currentRoute._tag === 'Products')),
            ],
            ['Products'],
          ),
          a(
            [Href(cartRouter.build({})), Class(navLinkClassName(currentRoute._tag === 'Cart'))],
            cartCount > 0 ? [`Cart (${cartCount})`] : ['Cart'],
          ),
          a(
            [
              Href(checkoutRouter.build({})),
              Class(navLinkClassName(currentRoute._tag === 'Checkout')),
            ],
            ['Checkout'],
          ),
        ],
      ),
    ],
  )
}

const productsView = (model: Model): Html => {
  return Products.view<Message>(
    model.productsPage,
    model.cart,
    cartRouter,
    (message) => ProductsMessage.make({ message }),
    (item) => AddToCartClicked.make({ item }),
    (itemId, quantity) => QuantityChangeClicked.make({ itemId, quantity }),
  )
}

const cartView = (model: Model): Html => {
  return CartPage.view<Message>(
    model.cart,
    productsRouter,
    checkoutRouter,
    (itemId, quantity) => ChangeCartQuantity.make({ itemId, quantity }),
    (itemId) => RemoveFromCart.make({ itemId }),
    () => ClearCart.make(),
  )
}

const checkoutView = (model: Model): Html => {
  return Checkout.view<Message>(
    model.cart,
    model.deliveryInstructions,
    model.orderPlaced,
    productsRouter,
    cartRouter,
    (value) => UpdateDeliveryInstructions.make({ value }),
    () => PlaceOrder.make(),
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
  const routeContent = Match.value(model.route).pipe(
    Match.tagsExhaustive({
      Products: () => productsView(model),
      Cart: () => cartView(model),
      Checkout: () => checkoutView(model),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

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
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: (request) => UrlRequestReceived.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(app)
