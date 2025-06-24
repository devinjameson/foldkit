import { Option } from 'effect'
import { Command } from './runtime'
import { ExtractTag, Tags } from 'effect/Types'
import { LazyArg } from 'effect/Function'

type PayloadOf<E, Tag extends Tags<E>> = Omit<ExtractTag<E, Tag>, '_tag'>

export type Payloads<E extends { _tag: string }> = {
  [K in Tags<E>]: PayloadOf<E, K>
}

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
