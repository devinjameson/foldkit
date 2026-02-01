import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

// MESSAGE

export const LogoutClicked = ts('LogoutClicked')
export const Message = S.Union(LogoutClicked)

export type LogoutClicked = typeof LogoutClicked.Type
export type Message = typeof Message.Type

// OUT MESSAGE

export const LogoutRequested = ts('LogoutRequested')
export const OutMessage = S.Union(LogoutRequested)

export type LogoutRequested = typeof LogoutRequested.Type
export type OutMessage = typeof OutMessage.Type
