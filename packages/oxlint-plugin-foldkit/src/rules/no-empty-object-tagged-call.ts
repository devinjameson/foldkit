import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
  isStringLiteral,
  isVariableDeclarator,
} from '../guards.ts'

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/

const UNION_HELPERS_BY_MODULE: Readonly<Record<string, string>> = {
  'foldkit/message': 'defineMessageUnion',
  'foldkit/route': 'defineRouteUnion',
  'foldkit/schema': 'defineTaggedUnion',
}

const recordUnionHelperBindings = (
  bindings: Set<string>,
  node: ESTree.Node,
): void => {
  if (node.type !== 'Program') {
    return
  }

  for (const statement of node.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type'
    ) {
      continue
    }

    const helperName = UNION_HELPERS_BY_MODULE[statement.source.value]
    if (helperName === undefined) {
      continue
    }

    for (const specifier of statement.specifiers) {
      if (
        specifier.type === 'ImportSpecifier' &&
        specifier.importKind !== 'type' &&
        (isIdentifier(specifier.imported, helperName) ||
          (isStringLiteral(specifier.imported) &&
            specifier.imported.value === helperName))
      ) {
        bindings.add(specifier.local.name)
      }
    }
  }
}

const isConventionalUnionNamespace = (name: string): boolean =>
  PASCAL_CASE.test(name) && /(?:Message|Route|State)$/.test(name)

const constructorName = (
  callee: unknown,
  unionNamespaces: ReadonlySet<string>,
): string | undefined => {
  if (isIdentifier(callee) && PASCAL_CASE.test(callee.name)) {
    return callee.name
  }
  if (
    isMemberExpression(callee) &&
    callee.computed !== true &&
    isIdentifier(callee.object) &&
    (unionNamespaces.has(callee.object.name) ||
      isConventionalUnionNamespace(callee.object.name)) &&
    isIdentifier(callee.property) &&
    PASCAL_CASE.test(callee.property.name)
  ) {
    return `${callee.object.name}.${callee.property.name}`
  }
  return undefined
}

/**
 * Flags calling a no-field union variant constructor with an empty object
 * literal instead of no arguments.
 */
export const noEmptyObjectTaggedCall = Rule.define({
  name: 'no-empty-object-tagged-call',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Call no-field union variant constructors with no arguments instead of an empty object.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const unionHelperBindings = new Set<string>()
    const unionNamespaces = new Set<string>()

    return {
      Program: (node: ESTree.Node) => {
        recordUnionHelperBindings(unionHelperBindings, node)
        return Effect.void
      },
      VariableDeclarator: (node: ESTree.Node) => {
        if (
          isVariableDeclarator(node) &&
          isIdentifier(node.id) &&
          isCallExpression(node.init) &&
          isIdentifier(node.init.callee) &&
          unionHelperBindings.has(node.init.callee.name)
        ) {
          unionNamespaces.add(node.id.name)
        }

        return Effect.void
      },
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        const name = constructorName(node.callee, unionNamespaces)
        if (name === undefined || node.arguments.length !== 1) {
          return Effect.void
        }
        const [argument] = node.arguments
        if (!isObjectExpression(argument) || argument.properties.length > 0) {
          return Effect.void
        }
        return ctx.report(
          Diagnostic.make({
            node,
            message: `Call no-field union variant constructors as ${name}() instead of ${name}({}).`,
          }),
        )
      },
    }
  },
})
