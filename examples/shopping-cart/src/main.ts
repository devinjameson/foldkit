import { Array, Data, Effect, Number, Option } from 'effect'
import {
  fold,
  makeApplication,
  updateConstructors,
  ApplicationInit,
  Url,
  UrlRequest,
} from '@foldkit'
import { Class, Html, OnClick, div, h1, h2, h3, p, button, span } from '@foldkit/html'

import { Cart, Item } from './domain'
import { products } from './data/products'

// MODEL

type Model = Readonly<{
  cart: Cart.Cart
}>

// MESSAGE

type Message = Data.TaggedEnum<{
  NoOp: {}
  UrlRequestReceived: { request: UrlRequest }
  UrlChanged: { url: Url }
  AddToCart: { item: Item.Item }
  RemoveFromCart: { itemId: string }
  ChangeQuantity: { itemId: string; quantity: number }
}>

const Message = Data.taggedEnum<Message>()

// INIT

const init: ApplicationInit<Model, Message> = (_url: Url) => {
  return [{ cart: [] }, Option.none()]
}

// UPDATE

const { pure } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  NoOp: pure((model) => model),
  UrlRequestReceived: pure((model) => model),
  UrlChanged: pure((model) => model),

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
})

// VIEW

const productsColumn = (): Html => {
  return div(
    [Class('bg-white rounded-lg shadow p-6')],
    [
      h2([Class('text-2xl font-bold text-gray-800 mb-4')], ['Products']),
      div(
        [Class('grid gap-4')],
        products.map((product) =>
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
              button(
                [
                  Class(
                    'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium',
                  ),
                  OnClick(() => Message.AddToCart({ item: product })),
                ],
                ['Add to Cart'],
              ),
            ],
          ),
        ),
      ),
    ],
  )
}

const shoppingCartColumn = (model: Model): Html => {
  return div(
    [Class('bg-white rounded-lg shadow p-6')],
    [
      h2([Class('text-2xl font-bold text-gray-800 mb-4')], ['Your Cart']),
      div(
        [],
        Array.match(model.cart, {
          onEmpty: () => [p([Class('text-gray-500 text-center py-8')], ['Your cart is empty'])],
          onNonEmpty: (cart) => [
            div(
              [Class('space-y-4')],
              cart.map((cartItem) =>
                div(
                  [Class('flex items-center justify-between p-4 border rounded-lg')],
                  [
                    div(
                      [],
                      [
                        h3([Class('font-semibold text-gray-800')], [cartItem.item.name]),
                        p([Class('text-gray-600')], [`$${cartItem.item.price.toFixed(2)} each`]),
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
                            OnClick(() =>
                              Message.ChangeQuantity({
                                itemId: cartItem.item.id,
                                quantity: cartItem.quantity - 1,
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
                            OnClick(() =>
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
                            Class('bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2'),
                            OnClick(() => Message.RemoveFromCart({ itemId: cartItem.item.id })),
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
              [Class('border-t pt-4 mt-6')],
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
          ],
        }),
      ),
    ],
  )
}

const view = (model: Model): Html => {
  return div(
    [Class('min-h-screen bg-gray-100 p-8')],
    [
      div(
        [Class('max-w-6xl mx-auto')],
        [
          h1([Class('text-4xl font-bold text-gray-800 mb-8 text-center')], ['Shopping Cart']),

          div(
            [Class('grid grid-cols-1 lg:grid-cols-2 gap-8')],
            [productsColumn(), shoppingCartColumn(model)],
          ),
        ],
      ),
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
