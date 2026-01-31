import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import * as Settings from './page/settings'

// MESSAGE

export const SettingsMessage = ts('SettingsMessage', {
  message: Settings.Message,
})
export const Message = S.Union(SettingsMessage)

export type SettingsMessage = typeof SettingsMessage.Type
export type Message = typeof Message.Type

// OUT MESSAGE

export const LogoutRequested = ts('LogoutRequested')
export const OutMessage = S.Union(LogoutRequested)

export type LogoutRequested = typeof LogoutRequested.Type
export type OutMessage = typeof OutMessage.Type
