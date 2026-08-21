import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

// MESSAGE

export const Message = defineMessageUnion({
  SubmittedLoginForm: {},
  SucceededAuthenticate: { sessionId: S.String },
})

export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  SucceededLogin: { sessionId: S.String },
})

export type OutMessage = typeof OutMessage.Type
