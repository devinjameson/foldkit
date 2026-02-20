import { Schema as S } from 'effect'
import { m } from 'foldkit/schema'

export const LoggedIn = m('LoggedIn', {
  userId: S.String,
  username: S.String,
})

export type LoggedIn = typeof LoggedIn.Type

export const initLoggedIn = (
  userId: string,
  username: string,
): LoggedIn => LoggedIn({ userId, username })
