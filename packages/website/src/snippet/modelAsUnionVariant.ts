import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

export const LoggedIn = ts('LoggedIn', {
  userId: S.String,
  username: S.String,
})

export type LoggedIn = typeof LoggedIn.Type

export const initLoggedIn = (
  userId: string,
  username: string,
): LoggedIn => LoggedIn({ userId, username })
