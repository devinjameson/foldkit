import { Array, Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isIdentifier, isProgram } from '../guards.ts'

// FILENAME

const SEPARATOR = '/'

const BARREL_FILENAMES: ReadonlyArray<string> = ['index.ts', 'index.tsx']

const segmentsOf = (filename: string): ReadonlyArray<string> =>
  filename.replaceAll('\\', SEPARATOR).split(SEPARATOR)

const isBarrelFilename = (filename: string): boolean =>
  pipe(
    Array.last(segmentsOf(filename)),
    Option.exists(basename => Array.contains(BARREL_FILENAMES, basename)),
  )

// STATEMENTS

const hasType = (node: unknown, type: string): boolean =>
  typeof node === 'object' &&
  node !== null &&
  'type' in node &&
  node.type === type

/**
 * A statement that names an export without defining it.
 *
 * `export * from './foo'` and `export * as Child from './child'` are the two
 * forms the convention asks for. A specifier only `export { view }` counts
 * too: it re-exports a binding an import brought in, so it defines nothing
 * either, and splitting the same intent across an import and an export line
 * is a formatting choice rather than a different kind of file.
 */
const isReExport = (statement: unknown): boolean =>
  hasType(statement, 'ExportAllDeclaration') ||
  (hasType(statement, 'ExportNamedDeclaration') &&
    (statement as ESTree.ExportNamedDeclaration).declaration === null)

const exportKindOf = (node: unknown): string =>
  typeof node === 'object' &&
  node !== null &&
  'exportKind' in node &&
  typeof node.exportKind === 'string'
    ? node.exportKind
    : 'value'

/**
 * A re-export that hands on a runtime binding.
 *
 * `export type { Model } from './model'` is not one. A type re-export emits
 * nothing, so a module file that forwards a type for convenience has not
 * turned itself into a barrel, and its own code is still where it belongs.
 * Only a re-exported value puts a second file's runtime surface behind this
 * one, which is the claim the rule holds a file to.
 */
const isValueReExport = (statement: unknown): boolean => {
  if (!isReExport(statement) || exportKindOf(statement) === 'type') {
    return false
  }
  const specifiers = (statement as { readonly specifiers?: unknown }).specifiers
  return (
    !Array.isArray(specifiers) ||
    specifiers.length === 0 ||
    !specifiers.every(specifier => exportKindOf(specifier) === 'type')
  )
}

/**
 * Declaration forms that vanish at compile time.
 *
 * Types are exempt on purpose. The convention exists to keep runtime code out
 * of a barrel, and a type alias or an interface emits nothing, adds no import
 * for a consumer to pull in, and cannot take part in an import cycle. A barrel
 * that widens a re-exported type, or names the shape its own re-exports
 * compose into, stays a barrel.
 */
const TYPE_ONLY_DECLARATION_TYPES: ReadonlyArray<string> = [
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  'TSDeclareFunction',
  'TSModuleDeclaration',
]

const isTypeOnlyDeclaration = (declaration: unknown): boolean =>
  TYPE_ONLY_DECLARATION_TYPES.some(type => hasType(declaration, type)) ||
  (typeof declaration === 'object' &&
    declaration !== null &&
    'declare' in declaration &&
    declaration.declare === true)

const declaredName = (declaration: unknown): Option.Option<string> => {
  if (hasType(declaration, 'VariableDeclaration')) {
    return pipe(
      Array.head((declaration as ESTree.VariableDeclaration).declarations),
      Option.flatMap(declarator =>
        isIdentifier(declarator.id)
          ? Option.some(declarator.id.name)
          : Option.none<string>(),
      ),
    )
  }
  const id = (declaration as { readonly id?: unknown }).id
  return isIdentifier(id) ? Option.some(id.name) : Option.none()
}

/**
 * The statement that carries the runtime code, paired with the declaration to
 * name in the diagnostic.
 *
 * `export const view = ...` reports on the export statement so the whole line
 * is highlighted, while the name comes from the declaration it wraps.
 */
interface RuntimeStatement {
  readonly statement: ESTree.Node
  readonly declaration: unknown
}

const declarationOf = (statement: unknown): unknown =>
  hasType(statement, 'ExportNamedDeclaration') ||
  hasType(statement, 'ExportDefaultDeclaration')
    ? (statement as { readonly declaration: unknown }).declaration
    : statement

const runtimeStatements = (
  program: ESTree.Program,
): ReadonlyArray<RuntimeStatement> =>
  program.body.flatMap(statement => {
    // Imports are what a barrel re-exports through, so they always belong.
    if (isReExport(statement) || hasType(statement, 'ImportDeclaration')) {
      return []
    }
    const declaration = declarationOf(statement)
    const runtime: ReadonlyArray<RuntimeStatement> = [
      { statement, declaration },
    ]
    return isTypeOnlyDeclaration(declaration) ? [] : runtime
  })

// RULE

// A barrel at a source root re-exports the folders under it, so there is no
// module folder to name a sibling file after. `src/src.ts` would be worse
// advice than none, and the generic wording still points the right way.
const SOURCE_ROOT_DIRECTORY_NAMES: ReadonlyArray<string> = ['src', 'lib']

const moduleDirectory = (filename: string): Option.Option<string> =>
  pipe(
    Array.last(segmentsOf(filename).slice(0, -1)),
    Option.filter(
      directory => !Array.contains(SOURCE_ROOT_DIRECTORY_NAMES, directory),
    ),
  )

const moveAdvice = (filename: string): string =>
  pipe(
    moduleDirectory(filename),
    Option.match({
      onNone: () =>
        'a named file beside the barrel and re-export it from there.',
      onSome: directory =>
        `a named file beside the barrel, such as \`${directory}/${directory}.ts\`, and re-export it with \`export * from './${directory}'\`.`,
    }),
  )

const WHY_A_BARREL =
  'An index file is a barrel: it lists what the module exposes and holds no code of its own, so a reader sees the whole surface at a glance, every definition has one obvious home, and a sibling reaching for that definition imports the file rather than looping back through the barrel.'

const namedMessage = (filename: string, name: string): string =>
  `\`index.ts\` declares \`${name}\` alongside its re-exports. ${WHY_A_BARREL} Move \`${name}\` into ${moveAdvice(filename)}`

const anonymousMessage = (filename: string): string =>
  `\`index.ts\` runs code of its own alongside its re-exports. ${WHY_A_BARREL} Move that code into ${moveAdvice(filename)}`

/**
 * Forbids runtime code in an `index.ts` that re-exports.
 *
 * An index file is a barrel. For a module `foo/`, `foo/foo.ts` holds the code
 * and `foo/index.ts` names what the module exposes, through
 * `export * from './foo'` and `export * as Child from './child'`.
 *
 * The rule only speaks up once a file has re-exported a value, because that is
 * the point where it has claimed to be a barrel. An index file that re-exports
 * nothing is the module file under another name, which is a naming choice
 * rather than a mixed file, and gathering imports into one namespace object is
 * the whole reason such a file exists.
 */
export const indexIsABarrel = Rule.define({
  name: 'index-is-a-barrel',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep index files as barrels. Real code lives in a named file the barrel re-exports.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      Program: (node: ESTree.Node) => {
        if (!isProgram(node) || !isBarrelFilename(ctx.filename)) {
          return Effect.void
        }
        if (!node.body.some(isValueReExport)) {
          return Effect.void
        }
        return Effect.forEach(
          runtimeStatements(node),
          ({ statement, declaration }) =>
            ctx.report(
              Diagnostic.make({
                node: statement,
                message: pipe(
                  declaredName(declaration),
                  Option.match({
                    onNone: () => anonymousMessage(ctx.filename),
                    onSome: name => namedMessage(ctx.filename, name),
                  }),
                ),
              }),
            ),
          { discard: true },
        )
      },
    }
  },
})
