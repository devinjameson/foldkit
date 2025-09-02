import { Data, Effect, Option } from 'effect'
import { fold, makeElement, updateConstructors, ElementInit } from '@foldkit'
import { Class, Html, OnClick, button, div } from '@foldkit/html'

// MODEL

type Model = number

// UPDATE

type Message = Data.TaggedEnum<{
  Decrement: {}
  Increment: {}
  Reset: {}
}>
const Message = Data.taggedEnum<Message>()

const { pure } = updateConstructors<Model, Message>()

const update = fold<Model, Message>({
  Decrement: pure((count) => count - 1),
  Increment: pure((count) => count + 1),
  Reset: pure(() => 0),
})

// INIT

const init: ElementInit<Model, Message> = () => [0, Option.none()]

// VIEW

const view = (count: Model): Html =>
  div(
    [Class('min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6')],
    [
      div([Class('text-6xl font-bold text-gray-800')], [count.toString()]),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          button([OnClick(Message.Decrement()), Class(buttonStyle)], ['-']),
          button([OnClick(Message.Reset()), Class(buttonStyle)], ['Reset']),
          button([OnClick(Message.Increment()), Class(buttonStyle)], ['+']),
        ],
      ),
    ],
  )

// STYLE

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

// RUN

const app = makeElement({
  init,
  update,
  view,
  container: document.body,
})

Effect.runFork(app)
