import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'
import { ts } from 'foldkit/schema'
import { Url } from 'foldkit/url'

import { Session } from './domain/session'
import { LoggedIn, LoggedOut } from './page'

const NoOp = ts('NoOp')
const LinkClicked = ts('LinkClicked', { request: Runtime.UrlRequest })
const UrlChanged = ts('UrlChanged', { url: Url })
const SessionLoaded = ts('SessionLoaded', { session: S.Option(Session) })
const SessionSaved = ts('SessionSaved')
const SessionCleared = ts('SessionCleared')
const LoggedOutMessage = ts('LoggedOutMessage', { message: LoggedOut.Message })
const LoggedInMessage = ts('LoggedInMessage', { message: LoggedIn.Message })

export const Message = S.Union(
  NoOp,
  LinkClicked,
  UrlChanged,
  SessionLoaded,
  SessionSaved,
  SessionCleared,
  LoggedOutMessage,
  LoggedInMessage,
)

export type NoOp = typeof NoOp.Type
export type LinkClicked = typeof LinkClicked.Type
export type UrlChanged = typeof UrlChanged.Type
export type SessionLoaded = typeof SessionLoaded.Type
export type SessionSaved = typeof SessionSaved.Type
export type SessionCleared = typeof SessionCleared.Type
export type LoggedOutMessage = typeof LoggedOutMessage.Type
export type LoggedInMessage = typeof LoggedInMessage.Type

export type Message = typeof Message.Type

export {
  NoOp,
  LinkClicked,
  UrlChanged,
  SessionLoaded,
  SessionSaved,
  SessionCleared,
  LoggedOutMessage,
  LoggedInMessage,
}
