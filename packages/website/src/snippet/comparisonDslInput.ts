import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  InputtedEmail: { value: S.String },
})
type Message = typeof Message.Type

const emailInput = (email: string, h: HtmlBuilder<Message>) =>
  h.input([
    h.Type('email'),
    h.Value(email),
    h.Placeholder('you@example.com'),
    h.OnInput(value => Message.InputtedEmail({ value })),
  ])
