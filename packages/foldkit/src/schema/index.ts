import { Array, Match as M, Schema as S, SchemaAST, Types } from 'effect'

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

/**
 * A no-field variant's constructor, whatever union it belongs to. Accepts
 * `Message.ClickedSave`, `AppRoute.Home`, and a no-field `defineTaggedUnion`
 * variant alike, and rejects any variant that carries fields.
 *
 * Use it to constrain a helper that can only build a variant carrying no data.
 * A router helper for a literal-only path is the usual case: the path parses
 * nothing, so the route it maps to must need nothing.
 *
 * Prefer this to writing `CallableTaggedStruct<Tag, {}>`. In TypeScript `{}`
 * means any non-nullish value, so that spelling reads as the opposite of what
 * it does.
 *
 * @example
 * ```typescript
 * const page = <Tag extends string>(slug: string, route: NoFields<Tag>) =>
 *   pipe(literal(slug), mapTo(route))
 *
 * const roadmapRouter = page('roadmap', AppRoute.Roadmap)
 * ```
 */
export type NoFields<Tag extends string> = CallableTaggedStruct<Tag, {}>

const assignPlainProperty = (
  output: Record<PropertyKey, unknown>,
  name: PropertyKey,
  value: unknown,
): void => {
  if (name === '__proto__') {
    Object.defineProperty(output, name, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    })
  } else {
    output[name] = value
  }
}

const isDirectlyCopyable = (ast: SchemaAST.AST): boolean => {
  if (
    ast.checks !== undefined ||
    ast.encoding !== undefined ||
    ast.context !== undefined ||
    ast.annotations?.['parseOptions'] !== undefined
  ) {
    return false
  }

  return M.value(ast).pipe(
    M.withReturnType<boolean>(),
    M.tagsExhaustive({
      Declaration: () => false,
      Null: () => true,
      Undefined: () => true,
      Void: () => true,
      Never: () => true,
      Unknown: () => true,
      Any: () => true,
      String: () => true,
      Number: () => true,
      Boolean: () => true,
      BigInt: () => true,
      Symbol: () => true,
      Literal: () => true,
      UniqueSymbol: () => true,
      ObjectKeyword: () => true,
      Enum: () => true,
      TemplateLiteral: ({ parts }) => parts.every(isDirectlyCopyable),
      Arrays: () => false,
      Objects: () => false,
      Union: ({ mode, types }) =>
        mode !== 'oneOf' && types.every(isDirectlyCopyable),
      Suspend: () => false,
    }),
  )
}

const getDirectPropertyNames = (
  propertySignatures: ReadonlyArray<SchemaAST.PropertySignature>,
): Array<PropertyKey> | undefined => {
  const names: Array<PropertyKey> = []

  for (const { name, type } of propertySignatures) {
    if (name !== '_tag' && !isDirectlyCopyable(SchemaAST.toType(type))) {
      return undefined
    }

    names.push(name)
  }

  return names
}

const makeCallable = <Tag extends string, Fields extends S.Struct.Fields>(
  tag: Tag,
  fields: Fields,
): CallableTaggedStruct<Tag, Fields> => {
  const schema = S.TaggedStruct(tag, fields)
  const propertyNames = Object.hasOwn(fields, '_tag')
    ? undefined
    : getDirectPropertyNames(schema.ast.propertySignatures)
  const make = (value: unknown) =>
    schema.make(
      /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
      (value ?? {}) as Parameters<typeof schema.make>[0],
    )
  const construct =
    propertyNames !== undefined
      ? (value: unknown): Record<PropertyKey, unknown> => {
          /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
          const input = (value ?? {}) as Record<PropertyKey, unknown>
          if (Object(input) !== input) {
            return make(value)
          }

          const output: Record<PropertyKey, unknown> = {}

          for (const name of propertyNames) {
            const descriptor = Object.getOwnPropertyDescriptor(input, name)

            if (
              name !== '_tag' &&
              descriptor === undefined &&
              Reflect.has(input, name)
            ) {
              return make(value)
            }

            if (descriptor !== undefined && !('value' in descriptor)) {
              return make(value)
            }

            const inputValue =
              descriptor === undefined ? undefined : input[name]

            if (name === '_tag') {
              if (inputValue !== undefined && inputValue !== tag) {
                return make(value)
              }

              assignPlainProperty(output, name, tag)
            } else {
              assignPlainProperty(output, name, inputValue)
            }
          }

          return output
        }
      : make

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return new Proxy(function () {} as unknown as object, {
    apply(_target, _thisArg, argumentsList) {
      return construct(argumentsList[0])
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
}

type TaggedUnionProperty = keyof S.TaggedUnion<{}>

type UnionProperty = TaggedUnionProperty | 'members' | 'subset'

const reservedUnionPropertyNames = new Set<string>(['members', 'subset'])

const taggedUnionTypeOnlyPropertyNames = new Set<string>([
  'Rebuild',
  '~type.parameters',
  'Type',
  'Encoded',
  'DecodingServices',
  'EncodingServices',
  '~type.make.in',
  '~type.make',
  '~type.constructor.default',
  'Iso',
  '~type.mutability',
  '~type.optionality',
  '~encoded.mutability',
  '~encoded.optionality',
] satisfies ReadonlyArray<TaggedUnionProperty>)

type VariantNameCollision<Name extends PropertyKey> = Readonly<{
  'Variant names must not conflict with union properties': Name
}>

type ValidateVariantNames<CasesByTag extends Record<string, S.Struct.Fields>> =
  Extract<keyof CasesByTag, UnionProperty> extends infer Name
    ? [Name] extends [never]
      ? unknown
      : VariantNameCollision<Name & PropertyKey>
    : never

type BaseTaggedUnion<CasesByTag extends Record<string, S.Struct.Fields>> =
  S.TaggedUnion<{
    readonly [Tag in keyof CasesByTag & string]: S.TaggedStruct<
      Tag,
      CasesByTag[Tag]
    >
  }>

interface UnionSchema<
  CasesByTag extends Record<string, S.Struct.Fields>,
> extends S.BottomLazy<
  BaseTaggedUnion<CasesByTag>['ast'],
  UnionSchema<CasesByTag>
> {
  readonly Type: BaseTaggedUnion<CasesByTag>['Type']
  readonly Encoded: BaseTaggedUnion<CasesByTag>['Encoded']
  readonly DecodingServices: BaseTaggedUnion<CasesByTag>['DecodingServices']
  readonly EncodingServices: BaseTaggedUnion<CasesByTag>['EncodingServices']
  readonly '~type.make.in': BaseTaggedUnion<CasesByTag>['~type.make.in']
  readonly '~type.make': BaseTaggedUnion<CasesByTag>['~type.make']
  readonly Iso: BaseTaggedUnion<CasesByTag>['Iso']
  readonly match: BaseTaggedUnion<CasesByTag>['match']
}

type TaggedUnionMemberFor<
  CasesByTag extends Record<string, S.Struct.Fields>,
  Tag extends keyof CasesByTag & string,
> = CallableTaggedStruct<Tag, CasesByTag[Tag]>

type TaggedUnionMember<CasesByTag extends Record<string, S.Struct.Fields>> = {
  readonly [Tag in keyof CasesByTag & string]: TaggedUnionMemberFor<
    CasesByTag,
    Tag
  >
}[keyof CasesByTag & string]

type TaggedUnionSubsetMembers<
  CasesByTag extends Record<string, S.Struct.Fields>,
  Tags extends ReadonlyArray<keyof CasesByTag & string>,
> = {
  readonly [Index in keyof Tags]: Tags[Index] extends keyof CasesByTag & string
    ? TaggedUnionMemberFor<CasesByTag, Tags[Index]>
    : never
}

interface RichUnionSchema<
  CasesByTag extends Record<string, S.Struct.Fields>,
> extends UnionSchema<CasesByTag> {
  readonly guards: BaseTaggedUnion<CasesByTag>['guards']
  readonly isAnyOf: BaseTaggedUnion<CasesByTag>['isAnyOf']
  readonly members: ReadonlyArray<TaggedUnionMember<CasesByTag>>
  /** Builds a Schema that accepts exactly the named variants. */
  readonly subset: <
    const Tags extends ReadonlyArray<keyof CasesByTag & string>,
  >(
    tags: Tags,
  ) => S.Union<TaggedUnionSubsetMembers<CasesByTag, Tags>>
}

/** A Schema union with exhaustive matching, per-variant guards, an `isAnyOf`
 * guard builder, explicit subsets, member schemas, and one callable constructor
 * per variant, reachable by tag. */
export type TaggedUnion<CasesByTag extends Record<string, S.Struct.Fields>> =
  RichUnionSchema<CasesByTag> & {
    readonly [Tag in keyof CasesByTag & string]: CallableTaggedStruct<
      Tag,
      CasesByTag[Tag]
    >
  }

/** The union `defineMessageUnion` returns. A Schema with exhaustive matching
 * and one callable constructor per variant, reachable by tag. */
export type MessageUnion<CasesByTag extends Record<string, S.Struct.Fields>> =
  UnionSchema<CasesByTag> & {
    readonly [Tag in keyof CasesByTag & string]: CallableTaggedStruct<
      Tag,
      CasesByTag[Tag]
    >
  }

/** The union `defineRouteUnion` returns. A Schema with exhaustive matching,
 * per-variant guards, explicit subsets, member schemas, and one callable
 * constructor per variant, reachable by tag. */
export type RouteUnion<CasesByTag extends Record<string, S.Struct.Fields>> =
  TaggedUnion<CasesByTag>

const defineUnion = <CasesByTag extends Record<string, S.Struct.Fields>>(
  variantLabel: string,
  casesByTag: Record<string, S.Struct.Fields>,
): TaggedUnion<CasesByTag> => {
  const union = S.TaggedUnion(casesByTag)

  const conflictingNames = Array.filter(
    Object.keys(casesByTag),
    name =>
      Reflect.has(union, name) ||
      taggedUnionTypeOnlyPropertyNames.has(name) ||
      reservedUnionPropertyNames.has(name),
  )
  if (Array.isArrayNonEmpty(conflictingNames)) {
    throw new Error(
      `${variantLabel} names conflict with union properties: ${conflictingNames.join(', ')}`,
    )
  }

  const callables: Record<
    string,
    CallableTaggedStruct<string, S.Struct.Fields>
  > = {}
  for (const [tag, fields] of Object.entries<S.Struct.Fields>(casesByTag)) {
    callables[tag] = makeCallable(tag, fields)
  }

  const subset = (tags: ReadonlyArray<string>) => {
    const members: Array<CallableTaggedStruct<string, S.Struct.Fields>> = []

    for (const tag of tags) {
      const member = callables[tag]
      if (!Object.hasOwn(callables, tag) || member === undefined) {
        throw new Error(`Union subset contains an unknown variant: ${tag}`)
      }

      members.push(member)
    }

    return S.Union(members)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return Object.assign(union, callables, {
    // NOTE: Schema.TaggedUnion drops the member list that Schema.Union
    // exposes. Machine.define reads it to enumerate the state tags.
    members: Object.values(callables),
    subset,
  }) as unknown as TaggedUnion<CasesByTag>
}

/**
 * Declares a whole Message union from one record of fields per variant, naming
 * each variant once instead of once per constructor and once in the union list.
 *
 * The result is a Schema, so it decodes and nests in a Model. Its focused
 * Message surface is exhaustive `match` plus one callable constructor per
 * variant. Each constructor is itself a schema, which is what `Command.define`
 * needs for its `messages` list.
 *
 * Use `Message.match` for exhaustive dispatch. The values are ordinary tagged
 * objects, so Effect `Match` remains available for partial matching, one
 * handler over several tags, and fallbacks.
 *
 * A Submodel's OutMessage is declared the same way, with variants of its own. A
 * Message is a fact the Submodel handles; an OutMessage is a fact it reports to
 * its parent. Sharing one variant between the two unions puts the child's
 * internal vocabulary in the parent's contract, so declare them separately even
 * when a pair happens to carry the same fields.
 *
 * A variant may not be named after the union surface it would shadow, such as
 * `make`, `match`, `cases`, `ast`, `members`, or `subset`. TypeScript reports the
 * conflicting names, and untyped calls fail with a runtime error.
 *
 * @example
 * ```typescript
 * export const Message = defineMessageUnion({
 *   ClickedReset: {},
 *   ChangedCount: { count: S.Number },
 * })
 * export type Message = typeof Message.Type
 *
 * Message.ClickedReset() // { _tag: 'ClickedReset' }
 * Message.ChangedCount({ count: 1 }) // { _tag: 'ChangedCount', count: 1 }
 * ```
 */
export function defineMessageUnion<
  const CasesByTag extends Record<string, S.Struct.Fields>,
>(
  casesByTag: CasesByTag & ValidateVariantNames<CasesByTag>,
): MessageUnion<CasesByTag> {
  return defineUnion<CasesByTag>('Message variant', casesByTag)
}

/**
 * Declares a whole tagged union from one record of fields per variant, naming
 * each variant once instead of once per constructor and once in the union list.
 *
 * Use this for domain unions that are not Messages or Routes: a Model's state,
 * a submission result, a filter mode. Messages use `defineMessageUnion` and
 * Routes use `defineRouteUnion`, so a reader can tell which kind of union a
 * declaration is from its first line.
 *
 * The result is a Schema with exhaustive `match`, per-variant `guards`, an
 * `isAnyOf` guard builder, explicit `subset` schemas, its `members`, and one
 * callable constructor per variant, reachable by tag. Each constructor is
 * itself a schema, so the union nests in a Model and its variants serve as
 * Union members.
 *
 * Reach for `taggedStruct` instead when a variant cannot be declared alongside
 * the others: a union whose variants reference the union itself, or a lone
 * tagged struct that belongs to no union.
 *
 * A variant may not be named after the union surface it would shadow, such as
 * `make`, `match`, `cases`, `ast`, `members`, or `subset`. TypeScript reports the
 * conflicting names, and untyped calls fail with a runtime error.
 *
 * @example
 * ```typescript
 * export const Submission = defineTaggedUnion({
 *   NotSubmitted: {},
 *   Submitting: {},
 *   Succeeded: {},
 *   Failed: { error: S.String },
 * })
 * export type Submission = typeof Submission.Type
 *
 * Submission.NotSubmitted() // { _tag: 'NotSubmitted' }
 * Submission.Failed({ error: 'timeout' })
 * ```
 */
export function defineTaggedUnion<
  const CasesByTag extends Record<string, S.Struct.Fields>,
>(
  casesByTag: CasesByTag & ValidateVariantNames<CasesByTag>,
): TaggedUnion<CasesByTag> {
  return defineUnion<CasesByTag>('Variant', casesByTag)
}

/**
 * Declares a whole Route union from one record of fields per variant, naming
 * each variant once instead of once per constructor and once in the union list.
 *
 * Each variant is a callable Schema, which is what `mapTo` and
 * `parseUrlWithFallback` need. Routers stay separate, because a Route is the
 * parsed value and a Router is the path that produces it.
 *
 * The result carries exhaustive `match`, per-variant `guards`, an `isAnyOf`
 * guard builder, explicit `subset` schemas, and its `members`. Use `subset`
 * when another Schema accepts only named members of the application Route
 * union. A later Route cannot join that subset unless its tag is added.
 *
 * A variant may not be named after the union surface it would shadow, such as
 * `make`, `match`, `cases`, `ast`, `members`, or `subset`. TypeScript reports the
 * conflicting names, and untyped calls fail with a runtime error.
 *
 * @example
 * ```typescript
 * export const AppRoute = defineRouteUnion({
 *   Home: {},
 *   Person: { personId: S.Number },
 *   NotFound: { path: S.String },
 * })
 * export type AppRoute = typeof AppRoute.Type
 *
 * export const homeRouter = pipe(root, mapTo(AppRoute.Home))
 * export const personRouter = pipe(
 *   literal('people'),
 *   slash(int('personId')),
 *   mapTo(AppRoute.Person),
 * )
 *
 * export const urlToAppRoute = parseUrlWithFallback(
 *   oneOf(personRouter, homeRouter),
 *   AppRoute.NotFound,
 * )
 * ```
 */
export function defineRouteUnion<
  const CasesByTag extends Record<string, S.Struct.Fields>,
>(
  casesByTag: CasesByTag & ValidateVariantNames<CasesByTag>,
): RouteUnion<CasesByTag> {
  return defineUnion<CasesByTag>('Route variant', casesByTag)
}

/**
 * Declares one tagged struct, callable directly as a constructor: `Loading()`
 * instead of `Loading.make()`.
 *
 * Reach for `defineTaggedUnion` first. Use `taggedStruct` for the shapes a
 * single record cannot express. For example: a union whose variants reference
 * the union itself, a union whose variants each belong to a different module,
 * a struct that is a child of another struct rather than a variant of a
 * choice, and a variant built inside a generic Schema factory.
 *
 * @example
 * ```typescript
 * const Loading = taggedStruct('Loading')
 * Loading() // { _tag: 'Loading' }
 *
 * const Ok = taggedStruct('Ok', { data: S.String })
 * Ok({ data: 'hello' }) // { _tag: 'Ok', data: 'hello' }
 * ```
 */
export function taggedStruct<Tag extends string>(
  tag: Tag,
): CallableTaggedStruct<Tag, {}>
export function taggedStruct<
  Tag extends string,
  Fields extends S.Struct.Fields,
>(tag: Tag, fields: Fields): CallableTaggedStruct<Tag, Fields>
export function taggedStruct(tag: string, fields: S.Struct.Fields = {}): any {
  return makeCallable(tag, fields)
}
