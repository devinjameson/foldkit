import { Schema as S } from 'effect'

/**
 * A wrapper around Effect Schema.taggedStruct.
 *
 * Abbreviated as `ts` because it's used so frequently throughout Foldkit applications.
 *
 * @example
 * ```typescript
 * // Simple tag
 * const Reset = ts('Reset')
 *
 * // Tag with fields
 * const SetCount = ts('SetCount', { count: S.Number })
 * ```
 */
export const ts: {
  <Tag extends string>(tag: Tag): S.TaggedStruct<Tag, {}>
  <Tag extends string, Fields extends S.Struct.Fields>(
    tag: Tag,
    fields: Fields,
  ): S.TaggedStruct<Tag, Fields>
} = <Tag extends string, Fields extends S.Struct.Fields = {}>(tag: Tag, fields?: Fields) =>
  S.TaggedStruct(tag, fields ?? {})
