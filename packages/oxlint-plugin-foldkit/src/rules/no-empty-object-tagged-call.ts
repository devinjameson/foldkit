import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
} from '../guards.ts'

const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/

// Effect and Foldkit namespaces whose PascalCase members are combinators, not
// union variants. `S` and `M` are excluded by the two-character floor below.
const NON_UNION_NAMESPACES: ReadonlySet<string> = new Set([
  'Array',
  'Chunk',
  'Command',
  'Context',
  'Data',
  'Duration',
  'Effect',
  'Either',
  'Equal',
  'Fiber',
  'Function',
  'Hash',
  'HashMap',
  'HashSet',
  'Html',
  'Layer',
  'Match',
  'Mount',
  'Number',
  'Option',
  'Order',
  'Predicate',
  'Record',
  'Result',
  'Schema',
  'Stream',
  'String',
  'Struct',
  'Subscription',
  'Update',
])

const isUnionNamespace = (name: string): boolean =>
  name.length > 1 && PASCAL_CASE.test(name) && !NON_UNION_NAMESPACES.has(name)

const constructorName = (callee: unknown): string | undefined => {
  if (isIdentifier(callee) && PASCAL_CASE.test(callee.name)) {
    return callee.name
  }
  if (
    isMemberExpression(callee) &&
    callee.computed !== true &&
    isIdentifier(callee.object) &&
    isUnionNamespace(callee.object.name) &&
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
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        const name = constructorName(node.callee)
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
