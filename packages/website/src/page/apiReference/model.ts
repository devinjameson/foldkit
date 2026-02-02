import { Array, Option, pipe } from 'effect'

import type {
  TypeDocItem,
  TypeDocJson,
  TypeDocModule,
} from './typedoc'
import { Kind } from './typedoc'

// Simplified model for rendering

export type ApiModule = {
  readonly name: string
  readonly functions: ReadonlyArray<ApiFunction>
  readonly types: ReadonlyArray<ApiType>
  readonly variables: ReadonlyArray<ApiVariable>
}

export type ApiFunction = {
  readonly name: string
  readonly description: Option.Option<string>
  readonly signatures: ReadonlyArray<ApiFunctionSignature>
  readonly sourceUrl: Option.Option<string>
}

export type ApiFunctionSignature = {
  readonly parameters: ReadonlyArray<ApiParameter>
  readonly returnType: string
  readonly typeParameters: ReadonlyArray<string>
}

export type ApiParameter = {
  readonly name: string
  readonly type: string
  readonly isOptional: boolean
  readonly defaultValue: Option.Option<string>
  readonly description: Option.Option<string>
}

export type ApiType = {
  readonly name: string
  readonly description: Option.Option<string>
  readonly typeDefinition: string
  readonly sourceUrl: Option.Option<string>
}

export type ApiVariable = {
  readonly name: string
  readonly description: Option.Option<string>
  readonly type: string
  readonly sourceUrl: Option.Option<string>
}

export type Model = {
  readonly modules: ReadonlyArray<ApiModule>
}

// Parsing

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

export const findModule = (
  model: Model,
  name: string,
): Option.Option<ApiModule> =>
  Array.findFirst(model.modules, (m) => m.name === name)
