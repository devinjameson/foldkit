import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  ToggledFaq: {
    id: S.String,
    isOpen: S.Boolean,
  },
})

export type Message = typeof Message.Type
