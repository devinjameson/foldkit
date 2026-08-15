import { Array, Effect, Option, pipe } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  isCallExpression,
  isIdentifier,
  isMemberExpression,
} from '../guards.ts'

const STREAM_OPERATOR_NAMES = ['map', 'mapEffect', 'filterMap', 'filter', 'tap']

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFunctionNode = (
  node: unknown,
): node is ESTree.ArrowFunctionExpression | ESTree.Function =>
  isRecord(node) &&
  (node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression')

const isPreventDefaultCall = (value: unknown): value is ESTree.CallExpression =>
  isCallExpression(value) &&
  isMemberExpression(value.callee) &&
  value.callee.computed !== true &&
  isIdentifier(value.callee.property, 'preventDefault')

const preventDefaultCalls = (
  value: unknown,
): ReadonlyArray<ESTree.CallExpression> => {
  if (!isRecord(value)) {
    return []
  }
  const nested = pipe(
    Object.entries(value),
    Array.filter(([key]) => key !== 'parent'),
    Array.flatMap(([, child]) => preventDefaultCalls(child)),
  )
  return isPreventDefaultCall(value) ? [value, ...nested] : nested
}

const streamOperatorName = (
  node: ESTree.CallExpression,
): Option.Option<string> => {
  if (
    node.callee.type !== 'MemberExpression' ||
    !AST.isMember(node.callee, 'Stream', STREAM_OPERATOR_NAMES)
  ) {
    return Option.none()
  }
  return isIdentifier(node.callee.property)
    ? Option.some(node.callee.property.name)
    : Option.none()
}

const diagnosticMessage = (operatorName: string): string =>
  `\`preventDefault()\` inside a \`Stream.${operatorName}\` callback runs on a later turn than the browser's event dispatch: the default action has already happened by the time it is called, so the call silently does nothing, whatever the Stream's source. Cancel the event inside the listener itself with \`Subscription.fromEventPreventDefault\`, whose mapper runs in-dispatch and which calls \`preventDefault()\` for every handled event. If this callback handles something other than a DOM event, suppress this rule with a disable comment.`

/**
 * Flags `event.preventDefault()` inside callbacks passed to Stream operators
 * (`Stream.map`, `Stream.mapEffect`, `Stream.filterMap`, `Stream.filter`,
 * `Stream.tap`).
 * Those callbacks run on a later turn than the browser's event dispatch, so
 * the default action has already happened and the call is dead code. The
 * cancellation belongs inside the listener itself, which is where
 * `Subscription.fromEventPreventDefault` runs its mapper.
 */
export const noPreventDefaultInStreamOperator = Rule.define({
  name: 'no-prevent-default-in-stream-operator',
  meta: Rule.meta({
    type: 'problem',
    description:
      'Disallow preventDefault inside Stream operator callbacks, where it runs after the default action.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return Option.match(streamOperatorName(node), {
          onNone: () => Effect.void,
          onSome: operatorName => {
            const calls = pipe(
              node.arguments,
              Array.filter(isFunctionNode),
              Array.flatMap(preventDefaultCalls),
            )
            return Effect.forEach(
              calls,
              call =>
                ctx.report(
                  Diagnostic.make({
                    node: call,
                    message: diagnosticMessage(operatorName),
                  }),
                ),
              { discard: true },
            )
          },
        })
      },
    }
  },
})
