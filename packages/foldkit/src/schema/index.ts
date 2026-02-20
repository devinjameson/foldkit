import { Schema as S } from 'effect'

/** A `TaggedStruct` schema that can be called directly as a constructor: `Foo({ count: 1 })` instead of `Foo.make({ count: 1 })`. */
export type CallableTaggedStruct<
  Tag extends string,
  Fields extends S.Struct.Fields,
> = S.TaggedStruct<Tag, Fields> &
  (keyof Fields extends never
    ? (
        value?: Parameters<S.TaggedStruct<Tag, Fields>['make']>[0] | void,
      ) => S.Simplify<S.Struct.Type<{ readonly _tag: S.tag<Tag> } & Fields>>
    : (
        value: Parameters<S.TaggedStruct<Tag, Fields>['make']>[0],
      ) => S.Simplify<S.Struct.Type<{ readonly _tag: S.tag<Tag> } & Fields>>)

const makeCallable = <Tag extends string, Fields extends S.Struct.Fields>(
  schema: S.TaggedStruct<Tag, Fields>,
): CallableTaggedStruct<Tag, Fields> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  new Proxy(schema, {
    apply(_target, _thisArg, argumentsList) {
      return schema.make(argumentsList[0])
    },
    get(target, property, receiver) {
      return Reflect.get(target, property, receiver)
    },
  }) as unknown as CallableTaggedStruct<Tag, Fields>

/**
 * Wraps `Schema.TaggedStruct` to create a message variant you can call directly as a constructor.
 * Use `m` for message types — write `ClickedReset()` instead of `ClickedReset.make()`.
 *
 * @example
 * ```typescript
 * const ClickedReset = m('ClickedReset')
 * ClickedReset() // { _tag: 'ClickedReset' }
 *
 * const ChangedCount = m('ChangedCount', { count: S.Number })
 * ChangedCount({ count: 1 }) // { _tag: 'ChangedCount', count: 1 }
 * ```
 */
export function m<Tag extends string>(tag: Tag): CallableTaggedStruct<Tag, {}>
export function m<Tag extends string, Fields extends S.Struct.Fields>(
  tag: Tag,
  fields: Fields,
): CallableTaggedStruct<Tag, Fields>
export function m(tag: string, fields: S.Struct.Fields = {}): any {
  return makeCallable(S.TaggedStruct(tag, fields))
}
