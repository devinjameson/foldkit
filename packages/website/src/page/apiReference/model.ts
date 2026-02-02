import { Array, Option, Order, Schema as S, pipe } from 'effect'

import {
  Kind,
  type TypeDocItem,
  type TypeDocJson,
  type TypeDocModule,
} from './typedoc'

// API Reference domain schemas

export const ApiParameter = S.Struct({
  name: S.String,
  type: S.String,
  isOptional: S.Boolean,
  defaultValue: S.Option(S.String),
  description: S.Option(S.String),
})

export type ApiParameter = typeof ApiParameter.Type

export const ApiFunctionSignature = S.Struct({
  parameters: S.Array(ApiParameter),
  returnType: S.String,
  typeParameters: S.Array(S.String),
})

export type ApiFunctionSignature = typeof ApiFunctionSignature.Type

export const ApiFunction = S.Struct({
  name: S.String,
  description: S.Option(S.String),
  signatures: S.Array(ApiFunctionSignature),
  sourceUrl: S.Option(S.String),
})

export type ApiFunction = typeof ApiFunction.Type

export const ApiType = S.Struct({
  name: S.String,
  description: S.Option(S.String),
  typeDefinition: S.String,
  sourceUrl: S.Option(S.String),
})

export type ApiType = typeof ApiType.Type

export const ApiVariable = S.Struct({
  name: S.String,
  description: S.Option(S.String),
  type: S.String,
  sourceUrl: S.Option(S.String),
})

export type ApiVariable = typeof ApiVariable.Type

export const ApiModule = S.Struct({
  name: S.String,
  functions: S.Array(ApiFunction),
  types: S.Array(ApiType),
  variables: S.Array(ApiVariable),
})

export type ApiModule = typeof ApiModule.Type

export const Model = S.Struct({
  modules: S.Array(ApiModule),
})

export type Model = typeof Model.Type

// Parsing helpers

const getDescription = (item: TypeDocItem): Option.Option<string> =>
  pipe(
    Option.fromNullable(item.comment?.summary),
    Option.flatMap(Array.head),
    Option.map((part) => part.text),
  )

const getSourceUrl = (item: TypeDocItem): Option.Option<string> =>
  pipe(
    Option.fromNullable(item.sources),
    Option.flatMap(Array.head),
    Option.flatMap((source) => Option.fromNullable(source.url)),
  )

const typeToString = (type: unknown): string => {
  if (!type || typeof type !== 'object') return 'unknown'

  const t = type as Record<string, unknown>

  switch (t.type) {
    case 'intrinsic':
      return t.name as string
    case 'literal':
      return JSON.stringify(t.value)
    case 'reference': {
      const name = t.name as string
      const typeArgs = t.typeArguments as unknown[] | undefined
      if (typeArgs && typeArgs.length > 0) {
        return `${name}<${typeArgs.map(typeToString).join(', ')}>`
      }
      return name
    }
    case 'array':
      return `Array<${typeToString(t.elementType)}>`
    case 'tuple': {
      const elements = t.elements as unknown[]
      return `[${elements.map(typeToString).join(', ')}]`
    }
    case 'union': {
      const types = t.types as unknown[]
      return types.map(typeToString).join(' | ')
    }
    case 'intersection': {
      const types = t.types as unknown[]
      return types.map(typeToString).join(' & ')
    }
    case 'reflection':
      return '{ ... }'
    case 'typeOperator': {
      const operator = t.operator as string
      const target = typeToString(t.target)
      return `${operator} ${target}`
    }
    default:
      return 'unknown'
  }
}

const parseFunction = (item: TypeDocItem): ApiFunction => ({
  name: item.name,
  description: getDescription(item),
  sourceUrl: getSourceUrl(item),
  signatures: (item.signatures ?? []).map((sig) => ({
    parameters: (sig.parameters ?? []).map((param) => ({
      name: param.name,
      type: typeToString(param.type),
      isOptional: param.flags?.isOptional ?? false,
      defaultValue: Option.fromNullable(param.defaultValue),
      description: pipe(
        Option.fromNullable(param.comment?.summary),
        Option.flatMap(Array.head),
        Option.map((part) => part.text),
      ),
    })),
    returnType: typeToString(sig.type),
    typeParameters: (sig.typeParameters ?? []).map((tp) => tp.name),
  })),
})

const parseType = (item: TypeDocItem): ApiType => ({
  name: item.name,
  description: getDescription(item),
  typeDefinition: typeToString(item.type),
  sourceUrl: getSourceUrl(item),
})

const parseVariable = (item: TypeDocItem): ApiVariable => ({
  name: item.name,
  description: getDescription(item),
  type: typeToString(item.type),
  sourceUrl: getSourceUrl(item),
})

const parseModule = (module: TypeDocModule): ApiModule => {
  const children = module.children ?? []

  return {
    name: module.name,
    functions: children
      .filter((item) => item.kind === Kind.Function)
      .map(parseFunction),
    types: children
      .filter((item) => item.kind === Kind.TypeAlias)
      .map(parseType),
    variables: children
      .filter((item) => item.kind === Kind.Variable)
      .map(parseVariable),
  }
}

export const parseTypedocJson = (json: TypeDocJson): Model => ({
  modules: (json.children ?? []).map(parseModule),
})

export type TableOfContentsEntry = {
  readonly id: string
  readonly text: string
  readonly level: 'h2' | 'h3'
}

const byName = <
  T extends { readonly name: string },
>(): Order.Order<T> =>
  Order.mapInput(Order.string, (item: T) => item.name)

const sortByName = <T extends { readonly name: string }>(
  items: ReadonlyArray<T>,
): ReadonlyArray<T> => Array.sort(items, byName())

export const getTableOfContents = (
  model: Model,
): ReadonlyArray<TableOfContentsEntry> =>
  Array.flatMap(model.modules, (module) => [
    { id: module.name, text: module.name, level: 'h2' as const },
    ...Array.map(sortByName(module.functions), (f) => ({
      id: `fn-${f.name}`,
      text: f.name,
      level: 'h3' as const,
    })),
    ...Array.map(sortByName(module.types), (t) => ({
      id: `type-${t.name}`,
      text: t.name,
      level: 'h3' as const,
    })),
    ...Array.map(sortByName(module.variables), (v) => ({
      id: `const-${v.name}`,
      text: v.name,
      level: 'h3' as const,
    })),
  ])
