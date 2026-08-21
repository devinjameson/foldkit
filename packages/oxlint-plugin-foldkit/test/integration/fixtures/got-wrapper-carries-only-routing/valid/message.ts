import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { Counter } from './counter'

// MESSAGE

const Message = defineMessageUnion({
  GotCounterMessage: {
  id: S.String,
  message: Counter.Message,
},
})
