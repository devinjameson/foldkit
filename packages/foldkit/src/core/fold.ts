import { Option, pipe, Tuple } from 'effect'
import { ExtractTag, Tags } from 'effect/Types'

import { CommandT } from './runtime'

type Update<Model, Message, R> = [Model, Option.Option<CommandT<Message, R>>]

export const Pure =
  <Model, R, Message = never>(f: (model: Model, message: Message) => Model) =>
  (model: Model, message: Message): Update<Model, Message, R> => [f(model, message), Option.none()]

export const Command =
  <Model, R, Message = never>(f: (model: Model, message: Message) => CommandT<Message, R>) =>
  (model: Model, message: Message): Update<Model, Message, R> => [
    model,
    Option.some(f(model, message)),
  ]

export const PureCommand =
  <Model, Message extends AllMessage, AllMessage, R>(
    f: (model: Model, message: Message) => [Model, CommandT<AllMessage, R>],
  ) =>
  (model: Model, message: Message): [Model, Option.Option<CommandT<AllMessage, R>>] =>
    pipe(f(model, message), Tuple.mapSecond(Option.some))

export type FoldReturn<Model, Message, R> = (
  model: Model,
  message: Message,
) => [Model, Option.Option<CommandT<Message, R>>]

export function fold<Model, Message extends { readonly _tag: string }, R>(handlers: {
  [K in Tags<Message>]: (
    model: Model,
    message: ExtractTag<Message, K>,
  ) => [Model, Option.Option<CommandT<Message, R>>]
}): FoldReturn<Model, Message, R> {
  return (model, message) => {
    /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
    const tag = message._tag as Tags<Message>

    return handlers[tag](
      model,
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      message as ExtractTag<Message, typeof tag>,
    )
  }
}
