import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'
import { Url } from 'foldkit/url'

import { Session } from './domain/session'
import { LoggedIn, LoggedOut } from './page'

export const NoOp = ts('NoOp')
export const ClickedLink = ts('ClickedLink', { request: Runtime.UrlRequest })
export const ChangedUrl = ts('ChangedUrl', { url: Url })
export const LoadedSession = ts('LoadedSession', { session: S.Option(Session) })
export const SavedSession = ts('SavedSession')
export const FailedSessionSave = ts('FailedSessionSave', { error: S.String })
export const ClearedSession = ts('ClearedSession')
export const FailedSessionClear = ts('FailedSessionClear', { error: S.String })
export const GotLoggedOutMessage = ts('GotLoggedOutMessage', {
  message: LoggedOut.Message,
})
export const GotLoggedInMessage = ts('GotLoggedInMessage', {
  message: LoggedIn.Message,
})

export const Message = S.Union(
  NoOp,
  ClickedLink,
  ChangedUrl,
  LoadedSession,
  SavedSession,
  FailedSessionSave,
  ClearedSession,
  FailedSessionClear,
  GotLoggedOutMessage,
  GotLoggedInMessage,
)
export type Message = typeof Message.Type
