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

// MODEL

type Model = Readonly<{
  message: string
}>

// MESSAGE

type Message = Data.TaggedEnum<{
  NoOp: {}
  UrlRequestReceived: { request: UrlRequest }
  UrlChanged: { url: Url }
}>

const Message = Data.taggedEnum<Message>()

// INIT

const init: ApplicationInit<Model, Message> = (_url: Url) => {
  return [{ message: 'Welcome to Shopping Cart!' }, Option.none()]
}

// UPDATE

const { pure } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  NoOp: pure((model) => model),
  UrlRequestReceived: pure((model) => model),
  UrlChanged: pure((model) => model),
})

// VIEW

const view = (model: Model): Html => {
  return div(
    [Class('min-h-screen bg-gray-100 p-8')],
    [
      div(
        [Class('max-w-4xl mx-auto')],
        [
          h1([Class('text-4xl font-bold text-gray-800 mb-6')], [model.message]),
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
