import { Effect, Schema } from 'effect'

import { Fold, Runtime } from '@foldkit/core'
import { Class, Html, OnClick, button, div } from '@foldkit/html'
import { ST, ts } from '@foldkit/schema'

// MODEL

const Model = Schema.Number
type Model = ST<typeof Model>

// MESSAGE

const Decrement = ts('Decrement')
const Increment = ts('Increment')
const Reset = ts('Reset')

const Message = Schema.Union(Decrement, Increment, Reset)

type Decrement = ST<typeof Decrement>
type Increment = ST<typeof Increment>
type Reset = ST<typeof Reset>

type Message = ST<typeof Message>

// UPDATE

const update = Fold.fold<Model, Message>({
  Decrement: (count) => [count - 1, []],
  Increment: (count) => [count + 1, []],
  Reset: () => [0, []],
})

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [0, []]

// VIEW

const view = (count: Model): Html =>
  div(
    [Class('min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6')],
    [
      div([Class('text-6xl font-bold text-gray-800')], [count.toString()]),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          button([OnClick(Decrement.make()), Class(buttonStyle)], ['-']),
          button([OnClick(Reset.make()), Class(buttonStyle)], ['Reset']),
          button([OnClick(Increment.make()), Class(buttonStyle)], ['+']),
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

Effect.runFork(element)
