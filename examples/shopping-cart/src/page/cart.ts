import { Route } from '@foldkit'
import { Array, Data, Option } from 'effect'
import { ExtractTag } from 'effect/Types'

import { Class, Href, Html, OnClick, a, button, div, h1, h3, p, span } from '@foldkit/html'

import { Cart } from '../domain'
import type { AppRoute } from '../main'

// MESSAGE

export type Message = Data.TaggedEnum<{
  ChangeQuantity: { itemId: string; quantity: number }
  RemoveFromCart: { itemId: string }
  ClearCart: {}
}>

export const Message = Data.taggedEnum<Message>()

// VIEW

export const view = <ParentMessage>(
  cart: Cart.Cart,
  productsRouter: Route.default.Router<ExtractTag<AppRoute, 'Products'>>,
  checkoutRouter: Route.default.Router<ExtractTag<AppRoute, 'Checkout'>>,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  return div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-8')], ['Shopping Cart']),
      div(
        [Class('bg-white rounded-lg shadow p-6')],
        [
          div(
            [],
            Array.match(cart, {
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
                                  toMessage(
                                    Message.ChangeQuantity({
                                      itemId: cartItem.item.id,
                                      quantity: cartItem.quantity - 1,
                                    }),
                                  ),
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
                                  toMessage(
                                    Message.ChangeQuantity({
                                      itemId: cartItem.item.id,
                                      quantity: cartItem.quantity + 1,
                                    }),
                                  ),
                                ),
                              ],
                              ['+'],
                            ),
                            button(
                              [
                                Class(
                                  'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded ml-2',
                                ),
                                OnClick(
                                  toMessage(Message.RemoveFromCart({ itemId: cartItem.item.id })),
                                ),
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
                        OnClick(toMessage(Message.ClearCart())),
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
