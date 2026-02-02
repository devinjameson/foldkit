// TypeDoc JSON structure types

export type TypeDocJson = {
  readonly schemaVersion: string
  readonly id: number
  readonly name: string
  readonly variant: string
  readonly kind: number
  readonly children: ReadonlyArray<TypeDocModule>
}

export type TypeDocModule = {
  readonly id: number
  readonly name: string
  readonly variant: string
  readonly kind: number
  readonly children: ReadonlyArray<TypeDocItem>
}

export type TypeDocItem = {
  readonly id: number
  readonly name: string
  readonly variant: string
  readonly kind: number
  readonly flags?: TypeDocFlags
  readonly comment?: TypeDocComment
  readonly sources?: ReadonlyArray<TypeDocSource>
  readonly signatures?: ReadonlyArray<TypeDocSignature>
  readonly type?: TypeDocType
  readonly typeParameters?: ReadonlyArray<TypeDocTypeParam>
  readonly children?: ReadonlyArray<TypeDocItem>
}

export type TypeDocFlags = {
  readonly isOptional?: boolean
  readonly isPrivate?: boolean
  readonly isProtected?: boolean
  readonly isStatic?: boolean
}

export type TypeDocComment = {
  readonly summary?: ReadonlyArray<TypeDocCommentPart>
  readonly blockTags?: ReadonlyArray<TypeDocBlockTag>
}

export type TypeDocCommentPart = {
  readonly kind: string
  readonly text: string
}

export type TypeDocBlockTag = {
  readonly tag: string
  readonly content: ReadonlyArray<TypeDocCommentPart>
}

export type TypeDocSource = {
  readonly fileName: string
  readonly line: number
  readonly character: number
  readonly url?: string
}

export type TypeDocSignature = {
  readonly id: number
  readonly name: string
  readonly variant: string
  readonly kind: number
  readonly comment?: TypeDocComment
  readonly parameters?: ReadonlyArray<TypeDocParam>
  readonly type?: TypeDocType
  readonly typeParameters?: ReadonlyArray<TypeDocTypeParam>
}

export type TypeDocParam = {
  readonly id: number
  readonly name: string
  readonly variant: string
  readonly kind: number
  readonly flags?: TypeDocFlags
  readonly type?: TypeDocType
  readonly defaultValue?: string
  readonly comment?: TypeDocComment
}

export type TypeDocTypeParam = {
  readonly id: number
  readonly name: string
  readonly variant: string
  readonly kind: number
  readonly type?: TypeDocType
  readonly default?: TypeDocType
}

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

export const kindToString = (kind: number): string => {
  switch (kind) {
    case Kind.Module:
      return 'Module'
    case Kind.Namespace:
      return 'Namespace'
    case Kind.Enum:
      return 'Enum'
    case Kind.Variable:
      return 'Variable'
    case Kind.Function:
      return 'Function'
    case Kind.Class:
      return 'Class'
    case Kind.Interface:
      return 'Interface'
    case Kind.Property:
      return 'Property'
    case Kind.Method:
      return 'Method'
    case Kind.TypeAlias:
      return 'Type'
    case Kind.Accessor:
      return 'Accessor'
    default:
      return 'Unknown'
  }
}
