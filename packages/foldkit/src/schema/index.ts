import { Schema as S, Types } from 'effect'

/** A `TaggedStruct` schema that can be called directly as a constructor: `Foo({ count: 1 })` instead of `Foo.make({ count: 1 })`. */
export type CallableTaggedStruct<
  Tag extends string,
  Fields extends S.Struct.Fields,
> = S.TaggedStruct<Tag, Fields> &
  (keyof Fields extends never
    ? (
        value?: Parameters<S.TaggedStruct<Tag, Fields>['make']>[0] | void,
      ) => Types.Simplify<S.Struct.Type<{ readonly _tag: S.tag<Tag> } & Fields>>
    : (
        value: Parameters<S.TaggedStruct<Tag, Fields>['make']>[0],
      ) => Types.Simplify<
        S.Struct.Type<{ readonly _tag: S.tag<Tag> } & Fields>
      >)

const makeCallable = <Tag extends string, Fields extends S.Struct.Fields>(
  schema: S.TaggedStruct<Tag, Fields>,
): CallableTaggedStruct<Tag, Fields> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  new Proxy(function () {} as unknown as object, {
    apply(_target, _thisArg, argumentsList) {
      return schema.make(argumentsList[0] ?? {})
    },
    get(_target, property, receiver) {
      return Reflect.get(schema, property, receiver)
    },
    has(_target, property) {
      return Reflect.has(schema, property)
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(schema)
    },
  }) as unknown as CallableTaggedStruct<Tag, Fields>

/**
 * Wraps `Schema.TaggedStruct` to create a message variant you can call directly as a constructor.
 * Use `m` for message types — enabling `ClickedReset()` instead of `ClickedReset.make()`.
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

/** Property names the schema surface already occupies. A variant cannot use
 *  one, because the constructor attached under that name would shadow it. */
type ReservedVariantName =
  | 'Encoded'
  | 'Iso'
  | 'Type'
  | 'annotate'
  | 'ast'
  | 'cases'
  | 'check'
  | 'guards'
  | 'isAnyOf'
  | 'make'
  | 'makeEffect'
  | 'makeOption'
  | 'match'
  | 'pipe'
  | 'rebuild'

/** The union `messages` returns. A `Schema.TaggedUnion` that also carries one
 *  callable constructor per variant, reachable by tag. */
export type Messages<CasesByTag extends Record<string, S.Struct.Fields>> =
  S.TaggedUnion<{
    readonly [Tag in keyof CasesByTag & string]: S.TaggedStruct<
      Tag,
      CasesByTag[Tag]
    >
  }> & {
    readonly [Tag in keyof CasesByTag & string]: CallableTaggedStruct<
      Tag,
      CasesByTag[Tag]
    >
  }

/**
 * Declares a whole Message union from one record of fields per variant, naming
 * each variant once instead of once per constructor and once in the union list.
 *
 * The result is a `Schema.TaggedUnion`, so it decodes, nests in a Model, and
 * carries `cases`, `guards`, and `isAnyOf`. Each variant hangs off it as a
 * callable constructor that is itself a schema, which is what `Command.define`
 * needs for its `messages` list.
 *
 * Matching is unaffected. The values are ordinary tagged objects, so `Match`
 * keeps working, including the forms `TaggedUnion.match` cannot express, such
 * as `M.tag` over several tags and `M.tags` with an `M.orElse` fallback.
 *
 * A Submodel's OutMessage is declared the same way, with variants of its own. A
 * Message is a fact the Submodel handles; an OutMessage is a fact it reports to
 * its parent. Sharing one variant between the two unions puts the child's
 * internal vocabulary in the parent's contract, so declare them separately even
 * when a pair happens to carry the same fields.
 *
 * `m` still declares a single variant, which is what existing code uses and
 * what keeps an incremental migration working.
 *
 * A variant may not be named after the schema surface it would shadow, such as
 * `make`, `match`, `cases`, or `ast`. Doing so is a type error.
 *
 * @example
 * ```typescript
 * export const Message = messages({
 *   ClickedReset: {},
 *   ChangedCount: { count: S.Number },
 * })
 * export type Message = typeof Message.Type
 *
 * Message.ClickedReset() // { _tag: 'ClickedReset' }
 * Message.ChangedCount({ count: 1 }) // { _tag: 'ChangedCount', count: 1 }
 * ```
 */
export function messages<
  const CasesByTag extends Record<string, S.Struct.Fields>,
>(
  casesByTag: Extract<keyof CasesByTag, ReservedVariantName> extends never
    ? CasesByTag
    : never,
): Messages<CasesByTag> {
  const union = S.TaggedUnion(casesByTag)

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  const members = union.cases as Record<
    string,
    S.TaggedStruct<string, S.Struct.Fields>
  >

  const callables: Record<string, unknown> = {}
  for (const [tag, member] of Object.entries(members)) {
    callables[tag] = makeCallable(member)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return Object.assign(union, callables) as unknown as Messages<CasesByTag>
}

/**
 * Wraps `Schema.TaggedStruct` to create a route variant you can call directly as a constructor.
 * Use `r` for route types — enabling `Home()` instead of `Home.make()`.
 *
 * @example
 * ```typescript
 * const Home = r('Home')
 * Home() // { _tag: 'Home' }
 *
 * const UserProfile = r('UserProfile', { id: S.String })
 * UserProfile({ id: 'abc' }) // { _tag: 'UserProfile', id: 'abc' }
 * ```
 */
export function r<Tag extends string>(tag: Tag): CallableTaggedStruct<Tag, {}>
export function r<Tag extends string, Fields extends S.Struct.Fields>(
  tag: Tag,
  fields: Fields,
): CallableTaggedStruct<Tag, Fields>
export function r(tag: string, fields: S.Struct.Fields = {}): any {
  return makeCallable(S.TaggedStruct(tag, fields))
}

/**
 * Wraps `Schema.TaggedStruct` to create a callable tagged struct you can call directly as a constructor.
 * Use `ts` for non-message, non-route tagged structs — enabling `Loading()`
 * instead of `Loading.make()`.
 *
 * @example
 * ```typescript
 * const Loading = ts('Loading')
 * Loading() // { _tag: 'Loading' }
 *
 * const Ok = ts('Ok', { data: S.String })
 * Ok({ data: 'hello' }) // { _tag: 'Ok', data: 'hello' }
 * ```
 */
export function ts<Tag extends string>(tag: Tag): CallableTaggedStruct<Tag, {}>
export function ts<Tag extends string, Fields extends S.Struct.Fields>(
  tag: Tag,
  fields: Fields,
): CallableTaggedStruct<Tag, Fields>
export function ts(tag: string, fields: S.Struct.Fields = {}): any {
  return makeCallable(S.TaggedStruct(tag, fields))
}
