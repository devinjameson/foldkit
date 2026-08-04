import { Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Document, HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL - Your entire application state

const Model = S.Struct({
  count: S.Number,
})
type Model = typeof Model.Type

// MESSAGE - Events that can happen in your app

const ClickedIncrement = m('ClickedIncrement')

const Message = S.Union([ClickedIncrement])
type Message = typeof Message.Type

// UPDATE - How Messages change the Model

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedIncrement: () => [evo(model, { count: count => count + 1 }), []],
    }),
  )

// VIEW - A pure function from Model to a Document

const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: `Count: ${model.count}`,
  body: h.div(
    [],
    [
      h.p([], [`Count: ${model.count}`]),
      h.button([h.OnClick(ClickedIncrement())], ['Increment']),
    ],
  ),
})
