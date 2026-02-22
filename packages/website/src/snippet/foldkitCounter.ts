import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'

// MODEL - your entire application state

const Model = S.Number
type Model = typeof Model.Type

// MESSAGE - events that can happen in your app

const ClickedIncrement = m('ClickedIncrement')
const Message = S.Union(ClickedIncrement)
type Message = typeof Message.Type

// UPDATE - how Messages change the Model

type UpdateReturn = [Model, ReadonlyArray<Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      ClickedIncrement: () => [model + 1, []],
    }),
  )

// VIEW - a pure function from Model to HTML

const { div, button, p, OnClick } = html<Message>()

const view = (model: Model): Html =>
  div(
    [],
    [
      p([], [`Count: ${model}`]),
      button([OnClick(ClickedIncrement())], ['Increment']),
    ],
  )
