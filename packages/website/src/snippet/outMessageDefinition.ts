import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

// MESSAGE

export const LogoutClicked = ts('LogoutClicked')
export const Message = S.Union(LogoutClicked)
export type Message = typeof Message.Type

// OUT MESSAGE

export const LogoutRequested = ts('LogoutRequested')
export const OutMessage = S.Union(LogoutRequested)
export type OutMessage = typeof OutMessage.Type
