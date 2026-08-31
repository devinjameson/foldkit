import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  GotWeather: { temperature: Schema.Number, },
})
