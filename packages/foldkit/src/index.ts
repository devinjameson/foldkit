import { Schema as S } from 'effect'
import { Struct } from 'effect/Schema'

export const VERSION = '0.1.0-canary.1'

export const ts: {
  <Tag extends string>(tag: Tag): S.TaggedStruct<Tag, {}>
  <Tag extends string, Fields extends Struct.Fields>(
    tag: Tag,
    fields: Fields,
  ): S.TaggedStruct<Tag, Fields>
} = <Tag extends string, Fields extends Struct.Fields = {}>(tag: Tag, fields?: Fields) =>
  S.TaggedStruct(tag, fields ?? {})

export type ST<T> = S.Schema.Type<T>

export * as Runtime from './core/runtime'
export * as Html from './core/html'
export * as Fold from './core/fold'
export * as FormValidation from './core/fieldValidation'
export * as Route from './core/route'
export * as Navigation from './core/navigation'
