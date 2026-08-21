import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Child from './child'

const Message = defineMessageUnion({
  ReceivedWeather: { temperature: S.Number, },
  GotChildMessage: {
  id: S.String,
  message: Child.Message,
},
})
