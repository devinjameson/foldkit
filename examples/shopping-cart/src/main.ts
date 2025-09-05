import { Data, Effect, Option } from 'effect'
import {
  fold,
  makeApplication,
  updateConstructors,
  ApplicationInit,
  Url,
  UrlRequest,
} from '@foldkit'
import { Class, Html, div, h1, p } from '@foldkit/html'
import { Cart, Item } from './domain'

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

const view = (_model: Model): Html => {
  return div(
    [Class('min-h-screen bg-gray-100 p-8')],
    [
      div(
        [Class('max-w-4xl mx-auto')],
        [
          h1([Class('text-4xl font-bold text-gray-800 mb-6')], ['Shopping Cart']),
          p([Class('text-lg text-gray-600')], ['A simple shopping cart built with foldkit.']),
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
