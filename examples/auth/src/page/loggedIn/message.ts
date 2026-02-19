import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import * as Settings from './page/settings'

// MESSAGE

export const GotSettingsMessage = ts('GotSettingsMessage', {
  message: Settings.Message,
})
export const Message = S.Union(GotSettingsMessage)
export type Message = typeof Message.Type

// OUT MESSAGE

export const RequestedLogout = ts('RequestedLogout')
export const OutMessage = S.Union(RequestedLogout)
export type OutMessage = typeof OutMessage.Type
