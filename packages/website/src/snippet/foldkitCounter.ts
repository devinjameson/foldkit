import { Match as M, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { ts } from 'foldkit/schema'

// MODEL

const Model = S.Number
type Model = typeof Model.Type

// MESSAGE

const IncrementClicked = ts('IncrementClicked')
const Message = S.Union(IncrementClicked)

type IncrementClicked = typeof IncrementClicked.Type
type Message = typeof Message.Type

// UPDATE

type UpdateReturn = [Model, ReadonlyArray<Runtime.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      IncrementClicked: () => [model + 1, []],
    }),
  )

// VIEW

const { div, button, p, OnClick } = html<Message>()

const view = (model: Model): Html =>
  div(
    [],
    [
      p([], [`Count: ${model}`]),
      button([OnClick(IncrementClicked.make())], ['Increment']),
    ],
  )
