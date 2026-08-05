import { Array, Effect, Option } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  importSource,
  isCallExpression,
  isIdentifier,
  isProgram,
  isVariableDeclaration,
} from '../guards.ts'

// The calls that start a runtime. `run` boots an Application or an Element and
// `embed` boots an Element inside a host page, handing the host its handle.
// `makeApplication` and `makeElement` are deliberately absent: they only build
// a description and start nothing, which is why the embedding example exports
// a `makeElement` wrapper from `main.ts` and lets the host decide when to boot.
const BOOT_NAMES: ReadonlyArray<string> = ['run', 'embed']

const FOLDKIT_ROOT = 'foldkit'

const FOLDKIT_RUNTIME = 'foldkit/runtime'

const RUNTIME_NAMESPACE = 'Runtime'

const ENTRY_MODULE_NAME = 'entry'

const SEPARATOR = '/'

/** The entry module is the one file whose whole job is to boot, so it is exempt. */
const isEntryModule = (filename: string): boolean => {
  const segments = filename.replaceAll('\\', SEPARATOR).split(SEPARATOR)
  const basename = segments[segments.length - 1] ?? ''
  const [stem] = basename.split('.')
  return stem === ENTRY_MODULE_NAME
}

/**
 * The local names in one module that reach foldkit's runtime module, either as
 * a namespace such as `Runtime` or as a directly imported boot function.
 */
interface RuntimeBindings {
  readonly namespaces: ReadonlyArray<string>
  readonly bootFunctions: ReadonlyArray<string>
}

const noBindings: RuntimeBindings = { namespaces: [], bootFunctions: [] }

const localName = (specifier: unknown): Option.Option<string> =>
  typeof specifier === 'object' &&
  specifier !== null &&
  'local' in specifier &&
  isIdentifier(specifier.local)
    ? Option.some(specifier.local.name)
    : Option.none()

const importedName = (specifier: unknown): Option.Option<string> =>
  typeof specifier === 'object' &&
  specifier !== null &&
  'imported' in specifier &&
  isIdentifier(specifier.imported)
    ? Option.some(specifier.imported.name)
    : Option.none()

const isTypeOnly = (node: unknown): boolean =>
  typeof node === 'object' &&
  node !== null &&
  'importKind' in node &&
  node.importKind === 'type'

const specifiersOf = (statement: ESTree.Node): ReadonlyArray<unknown> =>
  'specifiers' in statement && Array.isArray(statement.specifiers)
    ? statement.specifiers
    : []

const specifierType = (specifier: unknown): string =>
  typeof specifier === 'object' &&
  specifier !== null &&
  'type' in specifier &&
  typeof specifier.type === 'string'
    ? specifier.type
    : ''

/**
 * Read the runtime bindings one import declaration introduces.
 *
 * Only `foldkit` and `foldkit/runtime` count. A rule that flagged every call
 * named `run` would fire on any unrelated helper, so a call is only a boot
 * when its callee traces back to an import from foldkit itself.
 */
const bindingsFromImport = (statement: ESTree.Node): RuntimeBindings => {
  const maybeSource = importSource(statement)
  if (Option.isNone(maybeSource) || isTypeOnly(statement)) return noBindings
  const source = maybeSource.value
  if (source !== FOLDKIT_ROOT && source !== FOLDKIT_RUNTIME) return noBindings

  const specifiers = specifiersOf(statement).filter(
    specifier => !isTypeOnly(specifier),
  )

  const namespaces = specifiers.flatMap(specifier => {
    if (
      source === FOLDKIT_RUNTIME &&
      specifierType(specifier) === 'ImportNamespaceSpecifier'
    ) {
      return Option.toArray(localName(specifier))
    }
    if (
      source === FOLDKIT_ROOT &&
      specifierType(specifier) === 'ImportSpecifier' &&
      Option.exists(importedName(specifier), name => name === RUNTIME_NAMESPACE)
    ) {
      return Option.toArray(localName(specifier))
    }
    return []
  })

  const bootFunctions =
    source === FOLDKIT_RUNTIME
      ? specifiers.flatMap(specifier =>
          specifierType(specifier) === 'ImportSpecifier' &&
          Option.exists(importedName(specifier), name =>
            BOOT_NAMES.includes(name),
          )
            ? Option.toArray(localName(specifier))
            : [],
        )
      : []

  return { namespaces, bootFunctions }
}

const runtimeBindingsOf = (program: ESTree.Program): RuntimeBindings =>
  program.body.reduce<RuntimeBindings>((bindings, statement) => {
    const next = bindingsFromImport(statement)
    return {
      namespaces: [...bindings.namespaces, ...next.namespaces],
      bootFunctions: [...bindings.bootFunctions, ...next.bootFunctions],
    }
  }, noBindings)

const isBootCall = (
  bindings: RuntimeBindings,
  call: ESTree.CallExpression,
): boolean => {
  const callee = call.callee
  if (callee.type === 'Identifier') {
    return bindings.bootFunctions.includes(callee.name)
  }
  if (callee.type === 'MemberExpression') {
    return Option.exists(
      AST.memberPath(callee),
      path =>
        path.length === 2 &&
        bindings.namespaces.includes(Array.headNonEmpty(path)) &&
        BOOT_NAMES.includes(Array.lastNonEmpty(path)),
    )
  }
  return false
}

/** Unwrap `await call(...)`, which evaluates the call just the same. */
const withoutAwait = (expression: unknown): unknown =>
  typeof expression === 'object' &&
  expression !== null &&
  'type' in expression &&
  expression.type === 'AwaitExpression' &&
  'argument' in expression
    ? expression.argument
    : expression

/**
 * The expressions a top level statement evaluates while the module is being
 * imported.
 *
 * Both shapes count. `Runtime.run(application)` on its own line and
 * `const handle = Runtime.embed(element)` start the runtime at import time; the
 * second only keeps what the first throws away.
 */
const evaluatedExpressions = (
  statement: ESTree.Node,
): ReadonlyArray<unknown> => {
  const declaration =
    statement.type === 'ExportNamedDeclaration' && 'declaration' in statement
      ? statement.declaration
      : statement
  if (
    typeof declaration === 'object' &&
    declaration !== null &&
    'type' in declaration &&
    declaration.type === 'ExpressionStatement' &&
    'expression' in declaration
  ) {
    return [withoutAwait(declaration.expression)]
  }
  if (isVariableDeclaration(declaration)) {
    return declaration.declarations.map(declarator =>
      withoutAwait(declarator.init),
    )
  }
  return []
}

/**
 * Whether the module exports anything at runtime.
 *
 * This is what tells a defining module apart from a boot script. A module with
 * exports is written to be imported, by the entry module and by a test, so a
 * boot in it runs on every import. A module with no runtime exports is only
 * ever the thing that starts the app, whatever its filename, and a boot there
 * costs nobody a testable import. Type only exports are erased, so they do not
 * count.
 */
const hasRuntimeExports = (program: ESTree.Program): boolean =>
  program.body.some(
    statement =>
      statement.type.startsWith('Export') &&
      !('exportKind' in statement && statement.exportKind === 'type'),
  )

const moduleSideEffectBoots = (
  program: ESTree.Program,
): ReadonlyArray<ESTree.CallExpression> => {
  if (!hasRuntimeExports(program)) return []
  const bindings = runtimeBindingsOf(program)
  return program.body.flatMap(statement =>
    evaluatedExpressions(statement).flatMap(expression =>
      isCallExpression(expression) && isBootCall(bindings, expression)
        ? [expression]
        : [],
    ),
  )
}

const BOOT_MESSAGE =
  "This module starts the Foldkit runtime as a side effect of being imported, and it also exports bindings, so every importer pays for the boot. Starting the runtime is the entry module's job: `entry.ts` imports the Model, Messages, init, update, and view that a module like this one defines, assembles them with `Runtime.makeApplication`, and calls `Runtime.run`. That split is what lets a test import this module, call `update` or `view` directly, and get no runtime, no DOM, and no Commands out of the import. Move the `Runtime.run` or `Runtime.embed` call into `entry.ts`, or wrap it in an exported function so the caller decides when the runtime starts. Building an application with `Runtime.makeApplication` or `Runtime.makeElement` and exporting it is fine, because building starts nothing."

/**
 * Flags a call that starts the Foldkit runtime at module scope in a module that
 * also exports bindings.
 *
 * The defining module stays importable; `entry.ts` boots. A module that only
 * builds an application and exports it is untouched, because building starts
 * nothing.
 */
export const runtimeBootOnlyInEntry = Rule.define({
  name: 'runtime-boot-only-in-entry',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Start the Foldkit runtime from the entry module, so the modules it imports stay importable from tests.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      Program: (node: ESTree.Node) => {
        if (!isProgram(node) || isEntryModule(ctx.filename)) return Effect.void
        return Effect.forEach(
          moduleSideEffectBoots(node),
          call =>
            ctx.report(Diagnostic.make({ node: call, message: BOOT_MESSAGE })),
          { discard: true },
        )
      },
    }
  },
})
