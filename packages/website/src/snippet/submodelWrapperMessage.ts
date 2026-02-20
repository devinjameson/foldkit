import { Schema as S } from 'effect'
import { m } from 'foldkit/schema'

import * as Settings from './page/settings'

export const GotSettingsMessage = m('GotSettingsMessage', {
  message: Settings.Message,
})

export const Message = S.Union(GotSettingsMessage)
export type Message = typeof Message.Type
