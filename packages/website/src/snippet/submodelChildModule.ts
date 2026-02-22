import { Match as M, Schema as S } from 'effect'
import type { Command } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Model = S.Struct({
  theme: S.String,
  notifications: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

export const ChangedTheme = m('ChangedTheme', { theme: S.String })
export const Message = S.Union(ChangedTheme)
export type Message = typeof Message.Type

// UPDATE

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ChangedTheme: ({ theme }) => [
        evo(model, { theme: () => theme }),
        [],
      ],
    }),
  )
