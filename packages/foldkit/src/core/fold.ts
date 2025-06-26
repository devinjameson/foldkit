import { Option, pipe, Tuple } from 'effect'
import { ExtractTag, Tags } from 'effect/Types'

import { Command } from './runtime'

type Update<Model, Message> = [Model, Option.Option<Command<Message>>]

export const pure =
  <Model, Message = never>(f: (model: Model, message: Message) => Model) =>
  (model: Model, message: Message): Update<Model, Message> => [f(model, message), Option.none()]

export const command =
  <Model, Message = never>(f: (model: Model, message: Message) => Command<Message>) =>
  (model: Model, message: Message): Update<Model, Message> => [
    model,
    Option.some(f(model, message)),
  ]

export const pureCommand =
  <Model, Message extends AllMessage, AllMessage>(
    f: (model: Model, message: Message) => [Model, Command<AllMessage>],
  ) =>
  (model: Model, message: Message): [Model, Option.Option<Command<AllMessage>>] =>
    pipe(f(model, message), Tuple.mapSecond(Option.some))

export type FoldReturn<Model, Message> = (
  model: Model,
  message: Message,
) => [Model, Option.Option<Command<Message>>]

export function fold<Model, Message extends { readonly _tag: string }>(handlers: {
  [K in Tags<Message>]: (
    model: Model,
    message: ExtractTag<Message, K>,
  ) => [Model, Option.Option<Command<Message>>]
}): FoldReturn<Model, Message> {
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
