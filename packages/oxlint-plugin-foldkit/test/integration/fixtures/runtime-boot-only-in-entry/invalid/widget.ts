import { Effect, Schema as S } from 'effect'
import { embed, makeElement as makeFoldkitElement } from 'foldkit/runtime'
import { html as h } from 'foldkit/html'

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

export const init = (): readonly [Model, ReadonlyArray<never>] => [
  { count: 0 },
  [],
]

export const update = (model: Model): readonly [Model, ReadonlyArray<never>] => [
  model,
  [],
]

export const view = (model: Model) => h.div([], [String(model.count)])

const element = makeFoldkitElement({
  Model,
  flags: Effect.void,
  init,
  update,
  view,
  container: document.getElementById('widget'),
})

// The widget mounts itself the moment anything imports it, so the host cannot
// choose when it appears and a test cannot reach `view` without a DOM.
export const handle = embed(element)
