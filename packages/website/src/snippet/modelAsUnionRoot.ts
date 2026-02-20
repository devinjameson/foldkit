import { Schema as S } from 'effect'
import { m } from 'foldkit/schema'

const LoggedOut = m('LoggedOut', {
  email: S.String,
  password: S.String,
})

const LoggedIn = m('LoggedIn', {
  userId: S.String,
  username: S.String,
})

export const Model = S.Union(LoggedOut, LoggedIn)

export type Model = typeof Model.Type
