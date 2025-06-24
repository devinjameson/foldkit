import { Option } from 'effect'
import { ExtractTag, Tags } from 'effect/Types'
import { LazyArg } from 'effect/Function'

import { Command } from './runtime'

export const pure = <Model, Message = never>(
  model: Model,
): [Model, Option.Option<Command<Message>>] => [model, Option.none()]

export const command =
  <Message>(command: LazyArg<Command<Message>>) =>
  <Model>(model: Model): [Model, Option.Option<Command<Message>>] => [model, Option.some(command())]

export const pureCommand = <Model, Message>(
  model: Model,
  command: LazyArg<Command<Message>>,
): [Model, Option.Option<Command<Message>>] => [model, Option.some(command())]

export function fold<Model, E extends { readonly _tag: string }>(handlers: {
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
