import { Schema } from 'effect'
import { type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Model = Schema.Struct({
  content: Schema.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  UpdatedContent: { value: Schema.String },
})

export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({
  content: '',
})

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    UpdatedContent: ({ value }) => ({
      model: evo(model, { content: () => value }),
    }),
  })
