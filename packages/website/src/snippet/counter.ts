import { Schema as S } from 'effect'
import { Command, Runtime } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Model = S.Struct({
  count: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedDecrement: {},
  ClickedIncrement: {},
  ClickedReset: {},
})
export type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<readonly [Model, ReadonlyArray<Command.Command<Message>>]>(
    message,
    {
      ClickedDecrement: () => [evo(model, { count: count => count - 1 }), []],
      ClickedIncrement: () => [evo(model, { count: count => count + 1 }), []],
      ClickedReset: () => [evo(model, { count: () => 0 }), []],
    },
  )

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  { count: 0 },
  [],
]

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Counter: ${model.count}`,
  body: h.div(
    [
      h.Class(
        'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6',
      ),
    ],
    [
      h.div(
        [h.Class('text-6xl font-bold text-gray-800')],
        [model.count.toString()],
      ),
      h.div(
        [h.Class('flex flex-wrap justify-center gap-4')],
        [
          h.button(
            [h.OnClick(Message.ClickedDecrement()), h.Class(buttonStyle)],
            ['-'],
          ),
          h.button(
            [h.OnClick(Message.ClickedReset()), h.Class(buttonStyle)],
            ['Reset'],
          ),
          h.button(
            [h.OnClick(Message.ClickedIncrement()), h.Class(buttonStyle)],
            ['+'],
          ),
        ],
      ),
    ],
  ),
})

// STYLE

const buttonStyle = 'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'
