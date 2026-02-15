import { Schema as S } from 'effect'
import { Disclosure } from 'foldkit/ui'

export const Model = S.Record({
  key: S.String,
  value: Disclosure.Model,
})
export type Model = typeof Model.Type
