import { Match as M, Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

// MODEL

export const Model = S.Struct({
  theme: S.String,
  notifications: S.Boolean,
})

export type Model = typeof Model.Type

// MESSAGE

export const ThemeChanged = ts('ThemeChanged', { theme: S.String })
export const Message = S.Union(ThemeChanged)

export type ThemeChanged = typeof ThemeChanged.Type
export type Message = typeof Message.Type

// UPDATE

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ThemeChanged: ({ theme }) => [
        evo(model, { theme: () => theme }),
        [],
      ],
    }),
  )
