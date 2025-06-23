import { Option } from 'effect'
import { Command } from './runtime'
import { ExtractTag, Tags } from 'effect/Types'

export function match<Model, E extends { readonly _tag: string }>(handlers: {
  [K in Tags<E>]: (model: Model, message: ExtractTag<E, K>) => [Model, Option.Option<Command<E>>]
}): (model: Model, message: E) => [Model, Option.Option<Command<E>>] {
  return (model, message) => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const tag = message._tag as Tags<E>

    return handlers[tag](
      model,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      message as ExtractTag<E, typeof tag>,
    )
  }
}
