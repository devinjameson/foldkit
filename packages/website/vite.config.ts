import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { Array, Match as M, Option, Schema as S, pipe } from 'effect'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { codeToHtml } from 'shiki'
import { type Plugin, defineConfig } from 'vite'

import {
  typeDefFromChildren,
  typeToString,
} from './src/page/apiReference/typeToString'
import {
  Kind,
  type TypeDocItem,
  TypeDocJson,
  type TypeDocParam,
  type TypeDocSignature,
  type TypeDocTypeParam,
} from './src/page/apiReference/typedoc'

const highlightCodePlugin = (): Plugin => ({
  name: 'highlight-code',
  async transform(_code, id) {
    if (id.includes('?highlighted')) {
      const filePath = id.split('?')[0]
      const rawCode = await readFile(filePath, 'utf-8')
      const code = rawCode.trimEnd()

      const lines = code.split('\n')
      const lineCount = lines.length
      const lineDigits = String(lineCount).length

      const lang = filePath.endsWith('.tsx') ? 'tsx' : 'typescript'

      const html = await codeToHtml(code, {
        lang,
        theme: 'github-dark',
        decorations: lines.map((line, i) => ({
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
          properties: { 'data-line': i + 1 },
        })),
      })

      const htmlWithDigits = html.replace(
        '<pre ',
        `<pre data-line-digits="${lineDigits}" `,
      )

      return `export default ${JSON.stringify(htmlWithDigits)}`
    }
  },
})

const VIRTUAL_MODULE_ID = 'virtual:api-highlights'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

const formatTypeParam = (typeParam: TypeDocTypeParam): string => {
  const constraint = Option.match(typeParam.type, {
    onNone: () => '',
    onSome: () => ` extends ${typeToString(typeParam.type)}`,
  })
  const defaultValue = Option.match(typeParam.default, {
    onNone: () => '',
    onSome: () => ` = ${typeToString(typeParam.default)}`,
  })
  return `${typeParam.name}${constraint}${defaultValue}`
}

const formatParam = (parameter: TypeDocParam): string => {
  const optionalSuffix = parameter.flags.isOptional ? '?' : ''
  return `${parameter.name}${optionalSuffix}: ${typeToString(parameter.type)}`
}

const formatParams = (
  parameters: ReadonlyArray<TypeDocParam>,
): string =>
  Array.matchLeft(parameters, {
    onEmpty: () => '()',
    onNonEmpty: (first, rest) =>
      Array.match(rest, {
        onEmpty: () => `(${formatParam(first)})`,
        onNonEmpty: () =>
          pipe(
            parameters,
            Array.map((parameter) => `  ${formatParam(parameter)}`),
            Array.join(',\n'),
            (joined) => `(\n${joined}\n)`,
          ),
      }),
  })

const buildFunctionSignatureString = (
  signature: TypeDocSignature,
): string => {
  const typeParamString = pipe(
    signature.typeParameters,
    Option.filter(Array.isNonEmptyReadonlyArray),
    Option.match({
      onNone: () => '',
      onSome: (typeParams) =>
        pipe(
          typeParams,
          Array.map(formatTypeParam),
          Array.join(', '),
          (joined) => `<${joined}>`,
        ),
    }),
  )

  const paramString = pipe(
    signature.parameters,
    Option.filter(Array.isNonEmptyReadonlyArray),
    Option.match({
      onNone: () => '()',
      onSome: formatParams,
    }),
  )

  return `${typeParamString}${paramString}: ${typeToString(signature.type)}`
}

const functionEntries = (
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> =>
  pipe(
    item.signatures,
    Option.filter(Array.isNonEmptyReadonlyArray),
    Option.match({
      onNone: () => [],
      onSome: (signatures) => [
        [
          `function-${item.name}`,
          pipe(
            signatures,
            Array.map(
              (signature) =>
                `declare function _${buildFunctionSignatureString(signature)}`,
            ),
            Array.join('\n\n'),
          ),
        ] as const,
      ],
    }),
  )

const typeAliasEntries = (
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> => {
  const tsString = Option.match(item.type, {
    onNone: () =>
      `type ${item.name} = ${typeDefFromChildren(item.children)}`,
    onSome: () => `type ${item.name} = ${typeToString(item.type)}`,
  })
  return [[`type-${item.name}`, tsString] as const]
}

const interfaceEntries = (
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> => [
  [
    `interface-${item.name}`,
    `interface ${item.name} ${typeDefFromChildren(item.children)}`,
  ] as const,
]

const variableEntries = (
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> => [
  [
    `const-${item.name}`,
    `const ${item.name}: ${typeToString(item.type)}`,
  ] as const,
]

const itemToEntries = (
  item: TypeDocItem,
): ReadonlyArray<readonly [string, string]> =>
  M.value(item.kind).pipe(
    M.when(Kind.Function, () => functionEntries(item)),
    M.when(Kind.TypeAlias, () => typeAliasEntries(item)),
    M.when(Kind.Interface, () => interfaceEntries(item)),
    M.when(Kind.Variable, () => variableEntries(item)),
    M.orElse(() => []),
  )

// NOTE: Signatures are wrapped as `declare function _<sig>` so Shiki highlights them
// as valid TypeScript. This strips the wrapper from the highlighted HTML output.
const stripDeclarePrefix = (html: string): string =>
  html.replace(
    /<span[^>]*>declare<\/span><span[^>]*> function<\/span><span[^>]*> _<\/span>/g,
    '',
  )

const highlightApiSignaturesPlugin = (): Plugin => ({
  name: 'highlight-api-signatures',
  resolveId(id) {
    if (id === VIRTUAL_MODULE_ID) {
      return RESOLVED_VIRTUAL_MODULE_ID
    }
  },
  async load(id) {
    if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
      return
    }

    const jsonPath = resolve(__dirname, 'src/generated/api.json')
    const raw = await readFile(jsonPath, 'utf-8')
    const json = S.decodeUnknownSync(TypeDocJson)(JSON.parse(raw))

    const entries = Array.flatMap(json.children, ({ children }) =>
      Array.flatMap(children, itemToEntries),
    )

    const highlightedEntries = await Promise.all(
      Array.map(entries, async ([key, tsString]) => {
        const html = await codeToHtml(tsString, {
          lang: 'typescript',
          theme: 'github-dark',
        })
        return [
          key,
          key.startsWith('function-')
            ? stripDeclarePrefix(html)
            : html,
        ] as const
      }),
    )

    const highlighted = Object.fromEntries(highlightedEntries)

    return `export default ${JSON.stringify(highlighted)}`
  },
})

export default defineConfig({
  plugins: [
    tailwindcss(),
    foldkit(),
    highlightCodePlugin(),
    highlightApiSignaturesPlugin(),
  ],
})
