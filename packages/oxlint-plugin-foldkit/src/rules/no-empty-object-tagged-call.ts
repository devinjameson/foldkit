import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isMemberExpression,
  isObjectExpression,
} from '../guards.ts'

const constructorName = (callee: unknown): string | undefined => {
  if (isIdentifier(callee) && /^[A-Z][A-Za-z0-9]*$/.test(callee.name)) {
    return callee.name
  }
  if (
    isMemberExpression(callee) &&
    callee.computed !== true &&
    isIdentifier(callee.object) &&
    callee.object.name.endsWith('Message') &&
    isIdentifier(callee.property) &&
    /^[A-Z][A-Za-z0-9]*$/.test(callee.property.name)
  ) {
    return `${callee.object.name}.${callee.property.name}`
  }
  return undefined
}

/**
 * Flags calling a no-field Message constructor with an empty object literal
 * instead of no arguments.
 */
export const noEmptyObjectTaggedCall = Rule.define({
  name: 'no-empty-object-tagged-call',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Call no-field Message constructors with no arguments instead of an empty object.',
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
            message: `Call no-field Message constructors as ${name}() instead of ${name}({}).`,
          }),
        )
      },
    }
  },
})
