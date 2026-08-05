import { Effect, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { html as h } from 'foldkit/html'

// An embeddable widget exports a factory. `makeElement` describes an Element
// and returns it, so the module is safe to import from a test.

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

export const Flags = S.Struct({ initialCount: S.Number })
export type Flags = typeof Flags.Type

export const init = (flags: Flags): readonly [Model, ReadonlyArray<never>] => [
  { count: flags.initialCount },
  [],
]

export const update = (model: Model): readonly [Model, ReadonlyArray<never>] => [
  model,
  [],
]

export const view = (model: Model) => h.div([], [String(model.count)])

export const makeElement = (container: HTMLElement, flags: Flags) =>
  Runtime.makeElement({
    Model,
    Flags,
    flags: Effect.succeed(flags),
    init,
    update,
    view,
    container,
  })
