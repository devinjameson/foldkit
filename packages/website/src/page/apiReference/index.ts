import { Schema as S } from 'effect'

import apiJson from '../../generated/api.json'
import { parseTypedocJson, toTableOfContents } from './domain'
import { TypeDocJson } from './typedoc'

export * from './domain'
export { Model } from './model'
export { Message } from './message'
export { init } from './init'
export { update } from './update'
export { view } from './view'
export type { TypeDocJson } from './typedoc'

export const apiReference = parseTypedocJson(
  S.decodeUnknownSync(TypeDocJson)(apiJson),
)

export const apiReferenceTableOfContents =
  toTableOfContents(apiReference)
