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
export const LoggedOutMessage = ts('LoggedOutMessage', {
  message: LoggedOut.Message,
})
export const LoggedInMessage = ts('LoggedInMessage', {
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
  LoggedOutMessage,
  LoggedInMessage,
)

export type NoOp = typeof NoOp.Type
export type LinkClicked = typeof LinkClicked.Type
export type UrlChanged = typeof UrlChanged.Type
export type SessionLoaded = typeof SessionLoaded.Type
export type SessionSaved = typeof SessionSaved.Type
export type SessionSaveFailed = typeof SessionSaveFailed.Type
export type SessionCleared = typeof SessionCleared.Type
export type SessionClearFailed = typeof SessionClearFailed.Type
export type LoggedOutMessage = typeof LoggedOutMessage.Type
export type LoggedInMessage = typeof LoggedInMessage.Type

export type Message = typeof Message.Type
