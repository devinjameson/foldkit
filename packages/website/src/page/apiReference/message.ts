import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { ApiData } from './model'

export const Message = defineMessageUnion({
  RequestedApiData: {},
  SucceededLoadApiData: { apiData: ApiData },
  FailedLoadApiData: { error: S.String },
  ToggledSignature: {
    id: S.String,
    isOpen: S.Boolean,
  },
})

export type Message = typeof Message.Type
