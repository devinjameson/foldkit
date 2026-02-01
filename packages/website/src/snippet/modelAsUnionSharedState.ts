import { Schema as S } from 'effect'

export const Model = S.Struct({
  theme: S.String,
  authState: S.Union(LoggedOut, LoggedIn),
})

export type Model = typeof Model.Type
