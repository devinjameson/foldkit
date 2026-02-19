import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

// MESSAGE

export const ClickedLogout = ts('ClickedLogout')
export const Message = S.Union(ClickedLogout)
export type Message = typeof Message.Type

// OUT MESSAGE

export const RequestedLogout = ts('RequestedLogout')
export const OutMessage = S.Union(RequestedLogout)
export type OutMessage = typeof OutMessage.Type
