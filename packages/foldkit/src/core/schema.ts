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

/**
 * Extracts the TypeScript type from an Effect Schema.
 *
 * Abbreviated as `ST` (Schema Type) because it's used frequently throughout Foldkit applications.
 *
 * @example
 * ```typescript
 * const Model = S.Struct({ count: S.Number })
 * type Model = ST<typeof Model> // { count: number }
 *
 * const Reset = ts('Reset')
 * type Reset = ST<typeof Reset> // { _tag: "Reset" }
 * ```
 *
 * @template T - The Schema to extract the type from
 */
export type ST<T> = S.Schema.Type<T>
