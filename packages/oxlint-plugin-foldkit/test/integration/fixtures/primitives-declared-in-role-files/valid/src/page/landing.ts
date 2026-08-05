import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { m } from 'foldkit/message'

// A page small enough to live in one file owns every part of itself, the same
// way a single file app does.

export const Model = S.Struct({ email: S.String })
export type Model = typeof Model.Type

export const SubmittedEmail = m('SubmittedEmail', { email: S.String })
export const CompletedSignUp = m('CompletedSignUp')

export const SignUp = Command.define('SignUp', {
  args: { email: S.String },
  messages: [CompletedSignUp],
  execute: () => Effect.succeed(CompletedSignUp()),
})

export const view = (model: Model) => ih.div([], [ih.text(model.email)])
