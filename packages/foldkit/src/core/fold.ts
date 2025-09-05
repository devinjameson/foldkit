import { Option, pipe, Tuple } from 'effect'
import { ExtractTag, Tags } from 'effect/Types'

import { Command } from './runtime'

type Update<Model, Message> = [Model, Option.Option<Command<Message>>]
export type Init<Model, Message> = () => Update<Model, Message>

export type FoldReturn<Model, Message> = (
  model: Model,
  message: Message,
) => [Model, Option.Option<Command<Message>>]

export const updateConstructors = <Model, Message = never>() => {
  return {
    pure:
      <M extends Message = Message>(f: (model: Model, message: M) => Model) =>
      (model: Model, message: M): Update<Model, Message> => [f(model, message), Option.none()],

    identity: (model: Model): Update<Model, Message> => [model, Option.none()],

    command:
      <M extends Message = Message>(f: (model: Model, message: M) => Command<Message>) =>
      (model: Model, message: M): Update<Model, Message> => [model, Option.some(f(model, message))],

    pureCommand:
      <M extends Message, AllMessage extends Message = Message>(
        f: (model: Model, message: M) => [Model, Command<AllMessage>],
      ) =>
      (model: Model, message: M): [Model, Option.Option<Command<AllMessage>>] =>
        pipe(f(model, message), Tuple.mapSecond(Option.some)),
  }
}

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
