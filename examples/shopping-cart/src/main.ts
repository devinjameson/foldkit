import { Array, Data, Effect, Number, Option, pipe, Schema } from 'effect'
import {
  Route,
  fold,
  makeApplication,
  updateConstructors,
  ApplicationInit,
  Url,
  UrlRequest,
  Command,
} from '@foldkit'
import {
  Class,
  Html,
  OnClick,
  OnChange,
  Href,
  Value,
  Placeholder,
  div,
  h1,
  h2,
  h3,
  p,
  button,
  span,
  a,
  input,
  textarea,
} from '@foldkit/html'
import { literal } from '@foldkit/route'
import { pushUrl, replaceUrl, load } from '@foldkit/navigation'

import { Cart, Item } from './domain'
import { products } from './data/products'

// ROUTE

type AppRoute = Data.TaggedEnum<{
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
  Route.root,
  Route.query(ProductsQuerySchema),
  Route.mapTo(AppRoute.Products),
)

const cartRouter = pipe(literal('cart'), Route.mapTo(AppRoute.Cart))

const checkoutRouter = pipe(literal('checkout'), Route.mapTo(AppRoute.Checkout))

const routeParser = Route.oneOf(checkoutRouter, cartRouter, productsRouter)

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound)

// MODEL

type Model = Readonly<{
  route: AppRoute
  cart: Cart.Cart
  deliveryInstructions: string
  orderPlaced: boolean
}>

// MESSAGE

type Message = Data.TaggedEnum<{
  NoOp: {}
  UrlRequestReceived: { request: UrlRequest }
  UrlChanged: { url: Url }
  AddToCart: { item: Item.Item }
  RemoveFromCart: { itemId: string }
  ChangeQuantity: { itemId: string; quantity: number }
  SearchInputChanged: { value: string }
  ClearCart: {}
  UpdateDeliveryInstructions: { value: string }
  PlaceOrder: {}
}>

const Message = Data.taggedEnum<Message>()

// INIT

const init: ApplicationInit<Model, Message> = (url: Url) => {
  return [
    { route: urlToAppRoute(url), cart: [], deliveryInstructions: '', orderPlaced: false },
    Option.none(),
  ]
}

// UPDATE

const { pure, pureCommand } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  NoOp: pure((model) => model),

  UrlRequestReceived: pureCommand((model, { request }): [Model, Command<Message>] =>
    UrlRequest.$match(request, {
      Internal: ({ url }): [Model, Command<Message>] => [
        {
          ...model,
          route: urlToAppRoute(url),
        },
        pushUrl(url.pathname).pipe(Effect.map(() => Message.NoOp())),
      ],
      External: ({ href }): [Model, Command<Message>] => [
        model,
        load(href).pipe(Effect.map(() => Message.NoOp())),
      ],
    }),
  ),

  UrlChanged: pure((model, { url }) => ({
    ...model,
    route: urlToAppRoute(url),
  })),

  AddToCart: pure((model, { item }) => ({
    ...model,
    cart: Cart.addItem(item)(model.cart),
  })),

  RemoveFromCart: pure((model, { itemId }) => ({
    ...model,
    cart: Cart.removeItem(itemId)(model.cart),
  })),

  ChangeQuantity: pure((model, { itemId, quantity }) => ({
    ...model,
    cart: Cart.changeQuantity(itemId, quantity)(model.cart),
  })),

  SearchInputChanged: pureCommand((model, { value }): [Model, Command<Message>] => [
    model,
    replaceUrl(productsRouter.build({ searchText: Option.fromNullable(value || null) })).pipe(
      Effect.map(() => Message.NoOp()),
    ),
  ]),

  ClearCart: pure((model) => ({
    ...model,
    cart: [],
  })),

  UpdateDeliveryInstructions: pure((model, { value }) => ({
    ...model,
    deliveryInstructions: value,
  })),

  PlaceOrder: pure((model) => ({
    ...model,
    orderPlaced: true,
    cart: [],
    deliveryInstructions: '',
  })),
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
  const searchText = AppRoute.$is('Products')(model.route)
    ? Option.getOrElse(model.route.searchText, () => '')
    : ''

  const filteredProducts = searchText
    ? products.filter((product) => product.name.toLowerCase().includes(searchText.toLowerCase()))
    : products

  return div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-8')], ['Products']),
      div(
        [Class('bg-white rounded-lg shadow p-6')],
        [
          div(
            [Class('mb-6')],
            [
              input([
                Value(searchText),
                Placeholder('Search products...'),
                Class(
                  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                ),
                OnChange((value: string) => Message.SearchInputChanged({ value })),
              ]),
            ],
          ),
          div(
            [Class('grid gap-4')],
            filteredProducts.map((product) =>
              div(
                [Class('flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50')],
                [
                  div(
                    [],
                    [
                      h3([Class('font-semibold text-gray-800')], [product.name]),
                      p([Class('text-gray-600')], [`$${product.price.toFixed(2)}`]),
                    ],
                  ),
                  Cart.itemQuantity(product.id)(model.cart) === 0
                    ? button(
                        [
                          Class(
                            'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium',
                          ),
                          OnClick(Message.AddToCart({ item: product })),
                        ],
                        ['Add to Cart'],
                      )
                    : div(
                        [Class('flex items-center gap-2')],
                        [
                          button(
                            [
                              Class(
                                'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                              ),
                              OnClick(
                                Message.ChangeQuantity({
                                  itemId: product.id,
                                  quantity: Number.decrement(
                                    Cart.itemQuantity(product.id)(model.cart),
                                  ),
                                }),
                              ),
                            ],
                            ['-'],
                          ),
                          span(
                            [Class('px-3 py-1 font-medium min-w-[2rem] text-center font-mono')],
                            [String(Cart.itemQuantity(product.id)(model.cart))],
                          ),
                          button(
                            [
                              Class(
                                'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                              ),
                              OnClick(
                                Message.ChangeQuantity({
                                  itemId: product.id,
                                  quantity: Number.increment(
                                    Cart.itemQuantity(product.id)(model.cart),
                                  ),
                                }),
                              ),
                            ],
                            ['+'],
                          ),
                        ],
                      ),
                ],
              ),
            ),
          ),
        ],
      ),
      div(
        [Class('mt-6 text-center')],
        [
          a(
            [
              Href(cartRouter.build({})),
              Class(
                'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium inline-block',
              ),
            ],
            [`Go to Cart (${Cart.totalItems(model.cart)} items)`],
          ),
        ],
      ),
    ],
  )
}

const cartView = (model: Model): Html => {
  return div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-8')], ['Shopping Cart']),
      div(
        [Class('bg-white rounded-lg shadow p-6')],
        [
          div(
            [],
            Array.match(model.cart, {
              onEmpty: () => [
                p([Class('text-gray-500 text-center py-8')], ['Your cart is empty']),
                div(
                  [Class('text-center mt-4')],
                  [
                    a(
                      [
                        Href(productsRouter.build({ searchText: Option.none() })),
                        Class(
                          'bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-block',
                        ),
                      ],
                      ['Continue Shopping'],
                    ),
                  ],
                ),
              ],
              onNonEmpty: (cart) => [
                div(
                  [Class('space-y-4 mb-6')],
                  cart.map((cartItem) =>
                    div(
                      [Class('flex items-center justify-between p-4 border rounded-lg')],
                      [
                        div(
                          [],
                          [
                            h3([Class('font-semibold text-gray-800')], [cartItem.item.name]),
                            p(
                              [Class('text-gray-600')],
                              [`$${cartItem.item.price.toFixed(2)} each`],
                            ),
                          ],
                        ),
                        div(
                          [Class('flex items-center gap-2')],
                          [
                            button(
                              [
                                Class(
                                  'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                ),
                                OnClick(
                                  Message.ChangeQuantity({
                                    itemId: cartItem.item.id,
                                    quantity: Number.decrement(cartItem.quantity),
                                  }),
                                ),
                              ],
                              ['-'],
                            ),
                            span([Class('px-3 py-1 font-medium')], [String(cartItem.quantity)]),
                            button(
                              [
                                Class(
                                  'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                                ),
                                OnClick(
                                  Message.ChangeQuantity({
                                    itemId: cartItem.item.id,
                                    quantity: Number.increment(cartItem.quantity),
                                  }),
                                ),
                              ],
                              ['+'],
                            ),
                            button(
                              [
                                Class(
                                  'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2',
                                ),
                                OnClick(Message.RemoveFromCart({ itemId: cartItem.item.id })),
                              ],
                              ['Remove'],
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                div(
                  [Class('border-t pt-4 mb-6')],
                  [
                    div(
                      [Class('flex justify-between items-center')],
                      [
                        h3([Class('text-xl font-bold text-gray-800')], ['Total']),
                        p(
                          [Class('text-xl font-bold text-gray-800')],
                          [
                            `$${cart.reduce((total, item) => total + item.item.price * item.quantity, 0).toFixed(2)}`,
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
                div(
                  [Class('flex gap-4 justify-center')],
                  [
                    a(
                      [
                        Href(productsRouter.build({ searchText: Option.none() })),
                        Class(
                          'bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium',
                        ),
                      ],
                      ['Continue Shopping'],
                    ),
                    button(
                      [
                        Class(
                          'bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium',
                        ),
                        OnClick(Message.ClearCart()),
                      ],
                      ['Clear Cart'],
                    ),
                    a(
                      [
                        Href(checkoutRouter.build({})),
                        Class(
                          'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium',
                        ),
                      ],
                      ['Proceed to Checkout'],
                    ),
                  ],
                ),
              ],
            }),
          ),
        ],
      ),
    ],
  )
}

const checkoutView = (model: Model): Html => {
  if (model.orderPlaced) {
    return div(
      [Class('max-w-4xl mx-auto px-4 text-center')],
      [
        h1([Class('text-4xl font-bold text-green-600 mb-8')], ['Order placed successfully!']),
        div(
          [Class('bg-green-50 border border-green-200 rounded-lg p-6 mb-6')],
          [
            p(
              [Class('text-lg text-gray-700 mb-4')],
              ["Thank you for your order! We'll deliver it soon."],
            ),
            p([Class('text-gray-600')], ['You will receive a confirmation email shortly.']),
          ],
        ),
        a(
          [
            Href(productsRouter.build({ searchText: Option.none() })),
            Class(
              'bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-block',
            ),
          ],
          ['Continue Shopping'],
        ),
      ],
    )
  }

  return div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-8')], ['Checkout']),
      div(
        [Class('bg-white rounded-lg shadow p-6')],
        Array.match(model.cart, {
          onEmpty: () => [
            p([Class('text-gray-500 text-center py-8')], ['Your cart is empty']),
            div(
              [Class('text-center mt-4')],
              [
                a(
                  [
                    Href(productsRouter.build({ searchText: Option.none() })),
                    Class(
                      'bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium inline-block',
                    ),
                  ],
                  ['Start Shopping'],
                ),
              ],
            ),
          ],
          onNonEmpty: (cart) => [
            h2([Class('text-2xl font-bold text-gray-800 mb-4')], ['Order Summary']),
            div(
              [Class('space-y-2 mb-6')],
              cart.map((cartItem) =>
                div(
                  [Class('flex justify-between items-center py-2 border-b')],
                  [
                    div(
                      [],
                      [
                        span([Class('font-medium')], [cartItem.item.name]),
                        span([Class('text-gray-600 ml-2')], [`× ${cartItem.quantity}`]),
                      ],
                    ),
                    span(
                      [Class('font-medium')],
                      [`$${(cartItem.item.price * cartItem.quantity).toFixed(2)}`],
                    ),
                  ],
                ),
              ),
            ),
            div(
              [Class('border-t pt-4 mb-6')],
              [
                div(
                  [Class('flex justify-between items-center text-xl font-bold')],
                  [
                    span([], ['Total']),
                    span(
                      [],
                      [
                        `$${cart.reduce((total, item) => total + item.item.price * item.quantity, 0).toFixed(2)}`,
                      ],
                    ),
                  ],
                ),
              ],
            ),
            div(
              [Class('mb-6')],
              [
                h3([Class('text-lg font-semibold text-gray-800 mb-2')], ['Delivery Instructions']),
                textarea([
                  Value(model.deliveryInstructions),
                  Placeholder('Special delivery instructions (optional)...'),
                  Class(
                    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none',
                  ),
                  OnChange((value: string) => Message.UpdateDeliveryInstructions({ value })),
                ]),
              ],
            ),
            div(
              [Class('flex gap-4 justify-center')],
              [
                a(
                  [
                    Href(cartRouter.build({})),
                    Class(
                      'bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium',
                    ),
                  ],
                  ['Back to Cart'],
                ),
                button(
                  [
                    Class(
                      'bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium',
                    ),
                    OnClick(Message.PlaceOrder()),
                  ],
                  ['Place Order'],
                ),
              ],
            ),
          ],
        }),
      ),
    ],
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

const app = makeApplication({
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
