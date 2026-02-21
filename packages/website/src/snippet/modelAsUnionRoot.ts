import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

const LoggedOut = ts('LoggedOut', {
  email: S.String,
  password: S.String,
})

const LoggedIn = ts('LoggedIn', {
  userId: S.String,
  username: S.String,
})

export const Model = S.Union(LoggedOut, LoggedIn)

export type Model = typeof Model.Type
