import { Data, Array, Effect, Option } from 'effect'
import { ExtractTag } from 'effect/Types'
import { Fold, Runtime, Route } from '@foldkit'
import {
  Class,
  Html,
  Href,
  OnClick,
  OnChange,
  Value,
  Placeholder,
  empty,
  div,
  h1,
  h3,
  p,
  button,
  span,
  input,
  a,
} from '@foldkit/html'
import { replaceUrl } from '@foldkit/navigation'

import { Cart, Item } from '../domain'
import type { AppRoute } from '../main'

// MODEL

export type Model = Readonly<{
  products: Item.Item[]
  searchText: string
}>

// MESSAGE

export type Message = Data.TaggedEnum<{
  NoOp: {}
  SearchInputChanged: { value: string }
  AddToCartClicked: { item: Item.Item }
  QuantityChangeClicked: { itemId: string; quantity: number }
}>

export const Message = Data.taggedEnum<Message>()

// INIT

export const init = (products: Item.Item[]): Model => ({
  products,
  searchText: '',
})

// UPDATE

const { identity, pureCommand } = Fold.updateConstructors<Model, Message>()

export const update = (productsRouter: Route.default.Router<ExtractTag<AppRoute, 'Products'>>) =>
  Fold.fold<Model, Message>({
    NoOp: identity,

    SearchInputChanged: pureCommand((model, { value }): [Model, Runtime.Command<Message>] => [
      {
        ...model,
        searchText: value,
      },
      replaceUrl(productsRouter.build({ searchText: Option.fromNullable(value || null) })).pipe(
        Effect.map(() => Message.NoOp()),
      ),
    ]),

    AddToCartClicked: identity,
    QuantityChangeClicked: identity,
  })

// VIEW

export const view = <ParentMessage>(
  model: Model,
  cart: Cart.Cart,
  cartRouter: Route.default.Router<ExtractTag<AppRoute, 'Cart'>>,
  toMessage: (msg: Message) => ParentMessage,
): Html => {
  const filteredProducts = model.searchText
    ? model.products.filter((product) =>
        product.name.toLowerCase().includes(model.searchText.toLowerCase()),
      )
    : model.products

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
                Value(model.searchText),
                Placeholder('Search products...'),
                Class(
                  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                ),
                OnChange((value: string) => toMessage(Message.SearchInputChanged({ value }))),
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
                  Cart.itemQuantity(product.id)(cart) === 0
                    ? button(
                        [
                          Class(
                            'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium',
                          ),
                          OnClick(toMessage(Message.AddToCartClicked({ item: product }))),
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
                                toMessage(
                                  Message.QuantityChangeClicked({
                                    itemId: product.id,
                                    quantity: Cart.itemQuantity(product.id)(cart) - 1,
                                  }),
                                ),
                              ),
                            ],
                            ['-'],
                          ),
                          span(
                            [Class('px-3 py-1 font-medium min-w-[2rem] text-center font-mono')],
                            [String(Cart.itemQuantity(product.id)(cart))],
                          ),
                          button(
                            [
                              Class(
                                'bg-gray-200 hover:bg-gray-300 text-gray-800 w-8 h-8 rounded flex items-center justify-center',
                              ),
                              OnClick(
                                toMessage(
                                  Message.QuantityChangeClicked({
                                    itemId: product.id,
                                    quantity: Cart.itemQuantity(product.id)(cart) + 1,
                                  }),
                                ),
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
          Array.match(cart, {
            onEmpty: () => empty,
            onNonEmpty: (cart) =>
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
                    [`Go to Cart (${Cart.totalItems(cart)})`],
                  ),
                ],
              ),
          }),
        ],
      ),
    ],
  )
}
