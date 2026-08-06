import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

export const GotWeather = m('GotWeather', {
  temperature: S.Number,
})

export const GotReceipt = m('GotReceipt', {
  message: S.String,
})
