import { Schema as S } from 'effect'

// TypeDoc JSON Schema definitions

export const TypeDocFlags = S.Struct({
  isOptional: S.optional(S.Boolean),
  isPrivate: S.optional(S.Boolean),
  isProtected: S.optional(S.Boolean),
  isStatic: S.optional(S.Boolean),
})

export type TypeDocFlags = typeof TypeDocFlags.Type

export const TypeDocCommentPart = S.Struct({
  kind: S.String,
  text: S.String,
})

export type TypeDocCommentPart = typeof TypeDocCommentPart.Type

export const TypeDocBlockTag = S.Struct({
  tag: S.String,
  content: S.Array(TypeDocCommentPart),
})

export type TypeDocBlockTag = typeof TypeDocBlockTag.Type

export const TypeDocComment = S.Struct({
  summary: S.optional(S.Array(TypeDocCommentPart)),
  blockTags: S.optional(S.Array(TypeDocBlockTag)),
})

export type TypeDocComment = typeof TypeDocComment.Type

export const TypeDocSource = S.Struct({
  fileName: S.String,
  line: S.Number,
  character: S.Number,
  url: S.optional(S.String),
})

export type TypeDocSource = typeof TypeDocSource.Type

// TypeDocType is recursive, so we use S.suspend
export type TypeDocType =
  | { readonly type: 'intrinsic'; readonly name: string }
  | { readonly type: 'literal'; readonly value: unknown }
  | {
      readonly type: 'reference'
      readonly name: string
      readonly package?: string
      readonly typeArguments?: ReadonlyArray<TypeDocType>
    }
  | { readonly type: 'array'; readonly elementType: TypeDocType }
  | {
      readonly type: 'tuple'
      readonly elements: ReadonlyArray<TypeDocType>
    }
  | {
      readonly type: 'union'
      readonly types: ReadonlyArray<TypeDocType>
    }
  | {
      readonly type: 'intersection'
      readonly types: ReadonlyArray<TypeDocType>
    }
  | {
      readonly type: 'reflection'
      readonly declaration?: TypeDocItem
    }
  | {
      readonly type: 'typeOperator'
      readonly operator: string
      readonly target: TypeDocType
    }
  | { readonly type: 'mapped' }
  | { readonly type: 'conditional' }
  | { readonly type: 'indexedAccess' }
  | { readonly type: 'query' }
  | { readonly type: 'predicate' }
  | { readonly type: 'unknown' }

// For complex recursive types, we keep them as plain types
// and use S.Unknown for the schema since full validation isn't critical
export const TypeDocTypeSchema = S.Unknown as S.Schema<TypeDocType>

export const TypeDocTypeParam = S.Struct({
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  type: S.optional(TypeDocTypeSchema),
  default: S.optional(TypeDocTypeSchema),
})

export type TypeDocTypeParam = typeof TypeDocTypeParam.Type

export const TypeDocParam = S.Struct({
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  flags: S.optional(TypeDocFlags),
  type: S.optional(TypeDocTypeSchema),
  defaultValue: S.optional(S.String),
  comment: S.optional(TypeDocComment),
})

export type TypeDocParam = typeof TypeDocParam.Type

export const TypeDocSignature = S.Struct({
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  comment: S.optional(TypeDocComment),
  parameters: S.optional(S.Array(TypeDocParam)),
  type: S.optional(TypeDocTypeSchema),
  typeParameters: S.optional(S.Array(TypeDocTypeParam)),
})

export type TypeDocSignature = typeof TypeDocSignature.Type

// TypeDocItem is recursive (children reference itself)
// Manual type definition needed for recursive reference
// Optional fields use `| undefined` to match S.optional output
export type TypeDocItem = {
  readonly id: number
  readonly name: string
  readonly variant: string
  readonly kind: number
  readonly flags?: TypeDocFlags | undefined
  readonly comment?: TypeDocComment | undefined
  readonly sources?: ReadonlyArray<TypeDocSource> | undefined
  readonly signatures?: ReadonlyArray<TypeDocSignature> | undefined
  readonly type?: TypeDocType | undefined
  readonly typeParameters?:
    | ReadonlyArray<TypeDocTypeParam>
    | undefined
  readonly children?: ReadonlyArray<TypeDocItem> | undefined
}

// Type assertion needed for recursive schemas - the manual type
// and S.optional produce compatible but not identical types
export const TypeDocItem = S.suspend(
  (): S.Schema<TypeDocItem> =>
    S.Struct({
      id: S.Number,
      name: S.String,
      variant: S.String,
      kind: S.Number,
      flags: S.optional(TypeDocFlags),
      comment: S.optional(TypeDocComment),
      sources: S.optional(S.Array(TypeDocSource)),
      signatures: S.optional(S.Array(TypeDocSignature)),
      type: S.optional(TypeDocTypeSchema),
      typeParameters: S.optional(S.Array(TypeDocTypeParam)),
      children: S.optional(S.Array(TypeDocItem)),
    }) as unknown as S.Schema<TypeDocItem>,
)

export const TypeDocModule = S.Struct({
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  children: S.Array(TypeDocItem),
})

export type TypeDocModule = typeof TypeDocModule.Type

export const TypeDocJson = S.Struct({
  schemaVersion: S.String,
  id: S.Number,
  name: S.String,
  variant: S.String,
  kind: S.Number,
  children: S.Array(TypeDocModule),
})

export type TypeDocJson = typeof TypeDocJson.Type

// Kind values from TypeDoc
export const Kind = {
  Project: 1,
  Module: 2,
  Namespace: 4,
  Enum: 8,
  EnumMember: 16,
  Variable: 32,
  Function: 64,
  Class: 128,
  Interface: 256,
  Constructor: 512,
  Property: 1024,
  Method: 2048,
  CallSignature: 4096,
  IndexSignature: 8192,
  ConstructorSignature: 16384,
  Parameter: 32768,
  TypeLiteral: 65536,
  TypeParameter: 131072,
  Accessor: 262144,
  GetSignature: 524288,
  SetSignature: 1048576,
  TypeAlias: 2097152,
  Reference: 4194304,
} as const
