import { Match as M, Schema } from 'effect'
import { Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { ts } from 'foldkit/schema'

// MODEL

const Model = Schema.Number
type Model = typeof Model.Type

// MESSAGE

const Decrement = ts('Decrement')
const Increment = ts('Increment')
const Reset = ts('Reset')

const Message = Schema.Union(Decrement, Increment, Reset)

type Decrement = typeof Decrement.Type
type Increment = typeof Increment.Type
type Reset = typeof Reset.Type

export type Message = typeof Message.Type

// UPDATE

const update = (
  count: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      Decrement: () => [count - 1, []],
      Increment: () => [count + 1, []],
      Reset: () => [0, []],
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [0, []]

// VIEW

const { div, button, Class, OnClick } = html<Message>()

const view = (count: Model): Html =>
  div(
    [
      Class(
        'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6',
      ),
    ],
    [
      div([Class('text-6xl font-bold text-gray-800')], [count.toString()]),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          button([OnClick(Decrement()), Class(buttonStyle)], ['-']),
          button([OnClick(Reset()), Class(buttonStyle)], ['Reset']),
          button([OnClick(Increment()), Class(buttonStyle)], ['+']),
        ],
      ),
    ],
  )

// STYLE

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
