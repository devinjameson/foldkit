import { Effect, Match as M, Option, Schema as S, pipe } from 'effect'
import { Route, Runtime } from 'foldkit'
import { Html } from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { literal } from 'foldkit/route'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { products } from './data/products'
import { Cart, Item } from './domain'
import {
  Class,
  Href,
  a,
  div,
  h1,
  header,
  keyed,
  li,
  main,
  nav,
  p,
  ul,
} from './html'
import { Cart as CartPage, Checkout, Products } from './page'

// ROUTE

export const ProductsRoute = ts('Products', { searchText: S.Option(S.String) })
export const CartRoute = ts('Cart')
export const CheckoutRoute = ts('Checkout')
export const NotFoundRoute = ts('NotFound', { path: S.String })
export const AppRoute = S.Union(
  ProductsRoute,
  CartRoute,
  CheckoutRoute,
  NotFoundRoute,
)

export type ProductsRoute = typeof ProductsRoute.Type
export type CartRoute = typeof CartRoute.Type
export type CheckoutRoute = typeof CheckoutRoute.Type
export type NotFoundRoute = typeof NotFoundRoute.Type
export type AppRoute = typeof AppRoute.Type

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
type Model = typeof Model.Type

// MESSAGE

const NoOp = ts('NoOp')
const LinkClicked = ts('LinkClicked', {
  request: Runtime.UrlRequest,
})
const UrlChanged = ts('UrlChanged', { url: Url })
const GotProductsMessage = ts('GotProductsMessage', {
  message: Products.Message,
})
const AddToCartClicked = ts('AddToCartClicked', { item: Item.Item })
const QuantityChangeClicked = ts('QuantityChangeClicked', {
  itemId: S.String,
  quantity: S.Number,
})
export const ChangeCartQuantity = ts('ChangeCartQuantity', {
  itemId: S.String,
  quantity: S.Number,
})
export const RemoveFromCart = ts('RemoveFromCart', { itemId: S.String })
export const ClearCart = ts('ClearCart')
export const UpdateDeliveryInstructions = ts('UpdateDeliveryInstructions', {
  value: S.String,
})
export const PlaceOrder = ts('PlaceOrder')

export const Message = S.Union(
  NoOp,
  LinkClicked,
  UrlChanged,
  GotProductsMessage,
  AddToCartClicked,
  QuantityChangeClicked,
  ChangeCartQuantity,
  RemoveFromCart,
  ClearCart,
  UpdateDeliveryInstructions,
  PlaceOrder,
)

type NoOp = typeof NoOp.Type
type LinkClicked = typeof LinkClicked.Type
type UrlChanged = typeof UrlChanged.Type
type GotProductsMessage = typeof GotProductsMessage.Type
type AddToCartClicked = typeof AddToCartClicked.Type
type QuantityChangeClicked = typeof QuantityChangeClicked.Type
type ChangeCartQuantity = typeof ChangeCartQuantity.Type
type RemoveFromCart = typeof RemoveFromCart.Type
type ClearCart = typeof ClearCart.Type
type UpdateDeliveryInstructions = typeof UpdateDeliveryInstructions.Type
type PlaceOrder = typeof PlaceOrder.Type

export type Message = typeof Message.Type

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

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      LinkClicked: ({ request }) =>
        M.value(request).pipe(
          M.withReturnType<[Model, ReadonlyArray<Runtime.Command<NoOp>>]>(),
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [pushUrl(urlToString(url)).pipe(Effect.as(NoOp.make()))],
            ],

            External: ({ href }) => [
              model,
              [load(href).pipe(Effect.as(NoOp.make()))],
            ],
          }),
        ),

      UrlChanged: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      GotProductsMessage: ({ message }) => {
        const [newProductsModel, commands] = Products.update(productsRouter)(
          model.productsPage,
          message,
        )

        return [
          evo(model, {
            productsPage: () => newProductsModel,
          }),
          commands.map(
            Effect.map((message) => GotProductsMessage.make({ message })),
          ),
        ]
      },

      AddToCartClicked: ({ item }) => [
        evo(model, {
          cart: () => Cart.addItem(item)(model.cart),
        }),
        [],
      ],

      QuantityChangeClicked: ({ itemId, quantity }) => [
        evo(model, {
          cart: () => Cart.changeQuantity(itemId, quantity)(model.cart),
        }),
        [],
      ],

      ChangeCartQuantity: ({ itemId, quantity }) => [
        evo(model, {
          cart: () => Cart.changeQuantity(itemId, quantity)(model.cart),
        }),
        [],
      ],

      RemoveFromCart: ({ itemId }) => [
        evo(model, {
          cart: () => Cart.removeItem(itemId)(model.cart),
        }),
        [],
      ],

      ClearCart: () => [
        evo(model, {
          cart: () => [],
        }),
        [],
      ],

      UpdateDeliveryInstructions: ({ value }) => [
        evo(model, {
          deliveryInstructions: () => value,
        }),
        [],
      ],

      PlaceOrder: () => [
        evo(model, {
          orderPlaced: () => true,
          cart: () => [],
          deliveryInstructions: () => '',
        }),
        [],
      ],
    }),
  )

// VIEW

const navigationView = (currentRoute: AppRoute, cartCount: number): Html => {
  const navLinkClassName = (isActive: boolean) =>
    `hover:bg-blue-600 font-medium px-3 py-1 rounded transition ${isActive ? 'bg-blue-700 bg-opacity-50' : ''}`

  return nav(
    [Class('bg-blue-500 text-white p-4 mb-6')],
    [
      ul(
        [Class('max-w-6xl mx-auto flex gap-6 justify-center list-none')],
        [
          li(
            [],
            [
              a(
                [
                  Href(productsRouter.build({ searchText: Option.none() })),
                  Class(navLinkClassName(currentRoute._tag === 'Products')),
                ],
                ['Products'],
              ),
            ],
          ),
          li(
            [],
            [
              a(
                [
                  Href(cartRouter.build({})),
                  Class(navLinkClassName(currentRoute._tag === 'Cart')),
                ],
                cartCount > 0 ? [`Cart (${cartCount})`] : ['Cart'],
              ),
            ],
          ),
          li(
            [],
            [
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
      ),
    ],
  )
}

const productsView = (model: Model): Html => {
  return Products.view(
    model.productsPage,
    model.cart,
    cartRouter,
    (message) => GotProductsMessage.make({ message }),
    (item) => AddToCartClicked.make({ item }),
    (itemId, quantity) => QuantityChangeClicked.make({ itemId, quantity }),
  )
}

const cartView = (model: Model): Html => {
  return CartPage.view(model.cart, productsRouter, checkoutRouter)
}

const checkoutView = (model: Model): Html => {
  return Checkout.view(
    model.cart,
    model.deliveryInstructions,
    model.orderPlaced,
    productsRouter,
    cartRouter,
  )
}

const notFoundView = (path: string): Html =>
  div(
    [Class('max-w-4xl mx-auto px-4 text-center')],
    [
      h1(
        [Class('text-4xl font-bold text-red-600 mb-6')],
        ['404 - Page Not Found'],
      ),
      p(
        [Class('text-lg text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
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
  const routeContent = M.value(model.route).pipe(
    M.tagsExhaustive({
      Products: () => productsView(model),
      Cart: () => cartView(model),
      Checkout: () => checkoutView(model),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

  return div(
    [Class('min-h-screen bg-gray-100')],
    [
      header([], [navigationView(model.route, Cart.totalItems(model.cart))]),
      main(
        [Class('py-8')],
        [keyed('div')(model.route._tag, [], [routeContent])],
      ),
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
    onUrlRequest: (request) => LinkClicked.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(app)
