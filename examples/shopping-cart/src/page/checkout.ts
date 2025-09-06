import { Route } from '@foldkit'
import { Array, Data, Option } from 'effect'
import { ExtractTag } from 'effect/Types'

import {
  Class,
  Href,
  Html,
  OnChange,
  OnClick,
  Placeholder,
  Value,
  a,
  button,
  div,
  h1,
  h2,
  h3,
  p,
  span,
  textarea,
} from '@foldkit/html'

import { Cart } from '../domain'
import type { AppRoute } from '../main'

// MESSAGE

export type Message = Data.TaggedEnum<{
  UpdateDeliveryInstructions: { value: string }
  PlaceOrder: {}
}>

export const Message = Data.taggedEnum<Message>()

// VIEW

export const view = <ParentMessage>(
  cart: Cart.Cart,
  deliveryInstructions: string,
  orderPlaced: boolean,
  productsRouter: Route.default.Router<ExtractTag<AppRoute, 'Products'>>,
  cartRouter: Route.default.Router<ExtractTag<AppRoute, 'Cart'>>,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  if (orderPlaced) {
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
              [Class('flex justify-between items-center text-xl font-bold mb-6')],
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
            div(
              [Class('mb-6')],
              [
                h3([Class('text-lg font-semibold text-gray-800 mb-2')], ['Delivery Instructions']),
                textarea([
                  Value(deliveryInstructions),
                  Placeholder('Special delivery instructions (optional)...'),
                  Class(
                    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none',
                  ),
                  OnChange((value: string) =>
                    toMessage(Message.UpdateDeliveryInstructions({ value })),
                  ),
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
                    OnClick(toMessage(Message.PlaceOrder())),
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
