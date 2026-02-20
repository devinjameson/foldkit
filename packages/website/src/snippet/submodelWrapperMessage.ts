import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import * as Settings from './page/settings'

export const GotSettingsMessage = ts('GotSettingsMessage', {
  message: Settings.Message,
})

export const Message = S.Union(GotSettingsMessage)
export type Message = typeof Message.Type
