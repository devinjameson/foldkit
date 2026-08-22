import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  GotWeather: { temperature: S.Number, },
})
