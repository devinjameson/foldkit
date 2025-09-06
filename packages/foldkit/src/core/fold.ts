import { ExtractTag, Tags } from 'effect/Types'

import { Command } from './runtime'

type Update<Model, Message> = [Model, Command<Message>[]]
export type Init<Model, Message> = () => Update<Model, Message>

export type FoldReturn<Model, Message> = (
  model: Model,
  message: Message,
) => [Model, Command<Message>[]]

export function fold<Model, Message extends { readonly _tag: string }>(handlers: {
  [K in Tags<Message>]: (
    model: Model,
    message: ExtractTag<Message, K>,
  ) => [Model, Command<Message>[]]
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
