import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

// MESSAGE

export const ClickedReload = m('ClickedReload')
export const CompletedReload = m('CompletedReload', { total: S.Number })
export const Message = S.Union([ClickedReload, CompletedReload])
export type Message = typeof Message.Type
