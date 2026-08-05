import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { html as h } from 'foldkit/html'
import { m } from 'foldkit/message'

// The defining module. It names the Model and the Messages, and it may even
// assemble the Application, because assembling starts nothing. A test can
// import any of this and call it directly.

// MODEL

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

// MESSAGE

export const ClickedIncrement = m('ClickedIncrement')
export const Message = S.Union([ClickedIncrement])
export type Message = typeof Message.Type

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => [
  { count: 0 },
  [],
]

// UPDATE

export const update = (model: Model): readonly [Model, ReadonlyArray<never>] => [
  { count: model.count + 1 },
  [],
]

// VIEW

export const view = (model: Model) =>
  h.button([h.OnClick(ClickedIncrement())], [String(model.count)])

// PROGRAM

export const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})
