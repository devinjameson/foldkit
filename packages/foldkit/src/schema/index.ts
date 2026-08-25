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

type MessageVariantNameCollision<Name extends PropertyKey> = Readonly<{
  'Message variant names must not conflict with Schema.TaggedUnion properties': Name
}>

type ValidateMessageVariantNames<
  CasesByTag extends Record<string, S.Struct.Fields>,
> =
  Extract<keyof CasesByTag, TaggedUnionProperty> extends infer Name
    ? [Name] extends [never]
      ? unknown
      : MessageVariantNameCollision<Name & PropertyKey>
    : never

type TaggedMessageUnion<CasesByTag extends Record<string, S.Struct.Fields>> =
  S.TaggedUnion<{
    readonly [Tag in keyof CasesByTag & string]: S.TaggedStruct<
      Tag,
      CasesByTag[Tag]
    >
  }>

interface MessageSchema<
  CasesByTag extends Record<string, S.Struct.Fields>,
> extends S.BottomLazy<
  TaggedMessageUnion<CasesByTag>['ast'],
  MessageSchema<CasesByTag>
> {
  readonly Type: TaggedMessageUnion<CasesByTag>['Type']
  readonly Encoded: TaggedMessageUnion<CasesByTag>['Encoded']
  readonly DecodingServices: TaggedMessageUnion<CasesByTag>['DecodingServices']
  readonly EncodingServices: TaggedMessageUnion<CasesByTag>['EncodingServices']
  readonly '~type.make.in': TaggedMessageUnion<CasesByTag>['~type.make.in']
  readonly '~type.make': TaggedMessageUnion<CasesByTag>['~type.make']
  readonly Iso: TaggedMessageUnion<CasesByTag>['Iso']
  readonly match: TaggedMessageUnion<CasesByTag>['match']
}

/** The union `defineMessageUnion` returns. A Schema with exhaustive matching
 * and one callable constructor per variant, reachable by tag. */
export type MessageUnion<CasesByTag extends Record<string, S.Struct.Fields>> =
  MessageSchema<CasesByTag> & {
    readonly [Tag in keyof CasesByTag & string]: CallableTaggedStruct<
      Tag,
      CasesByTag[Tag]
    >
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
 * A variant may not be named after the schema surface it would shadow, such as
 * `make`, `match`, `cases`, or `ast`. TypeScript reports the conflicting names,
 * and untyped calls fail with a runtime error.
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
  casesByTag: CasesByTag & ValidateMessageVariantNames<CasesByTag>,
): MessageUnion<CasesByTag> {
  const union = S.TaggedUnion(casesByTag)

  const conflictingNames = Array.filter(
    Object.keys(casesByTag),
    name =>
      Reflect.has(union, name) || taggedUnionTypeOnlyPropertyNames.has(name),
  )
  if (Array.isArrayNonEmpty(conflictingNames)) {
    throw new Error(
      `Message variant names conflict with Schema.TaggedUnion properties: ${conflictingNames.join(', ')}`,
    )
  }

  const callables: Record<string, unknown> = {}
  for (const [tag, fields] of Object.entries<S.Struct.Fields>(casesByTag)) {
    callables[tag] = makeCallable(tag, fields)
  }

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  return Object.assign(union, callables) as unknown as MessageUnion<CasesByTag>
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
  return makeCallable(tag, fields)
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
  return makeCallable(tag, fields)
}
