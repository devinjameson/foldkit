import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { Settings } from './settings'

// MESSAGE

const Message = defineMessageUnion({
  GotSettingsMessage: {
  message: Settings.Message,
  timestamp: S.Number,
},
})
