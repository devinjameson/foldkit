import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { html as h } from 'foldkit/html'
import { m } from 'foldkit/message'

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

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
})

// A test that imports `update` from this module boots the runtime, looks for
// a `#root` element that is not there, and starts rendering.
Runtime.run(application)
