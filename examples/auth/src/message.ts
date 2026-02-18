import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'
import { Url } from 'foldkit/url'

import { Session } from './domain/session'
import { LoggedIn, LoggedOut } from './page'

export const NoOp = ts('NoOp')
export const LinkClicked = ts('LinkClicked', { request: Runtime.UrlRequest })
export const UrlChanged = ts('UrlChanged', { url: Url })
export const SessionLoaded = ts('SessionLoaded', { session: S.Option(Session) })
export const SessionSaved = ts('SessionSaved')
export const SessionSaveFailed = ts('SessionSaveFailed', { error: S.String })
export const SessionCleared = ts('SessionCleared')
export const SessionClearFailed = ts('SessionClearFailed', { error: S.String })
export const GotLoggedOutMessage = ts('GotLoggedOutMessage', {
  message: LoggedOut.Message,
})
export const GotLoggedInMessage = ts('GotLoggedInMessage', {
  message: LoggedIn.Message,
})

export const Message = S.Union(
  NoOp,
  LinkClicked,
  UrlChanged,
  SessionLoaded,
  SessionSaved,
  SessionSaveFailed,
  SessionCleared,
  SessionClearFailed,
  GotLoggedOutMessage,
  GotLoggedInMessage,
)
export type Message = typeof Message.Type
