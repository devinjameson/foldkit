import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import * as Settings from './page/settings'

export const SettingsMessage = ts('SettingsMessage', {
  message: Settings.Message,
})

export const Message = S.Union(SettingsMessage)

export type SettingsMessage = typeof SettingsMessage.Type
export type Message = typeof Message.Type
