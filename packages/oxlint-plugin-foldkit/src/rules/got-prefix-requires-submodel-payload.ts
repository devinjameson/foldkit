import { Effect } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { isCallExpression } from '../guards.ts'
import {
  hasMessagePayloadProperty,
  messageCases,
  recordFoldkitMessageUnionBindings,
} from '../message.ts'

/**
 * Requires Got-prefixed Messages to carry a { message: Child.Message } Submodel
 * payload.
 */
export const gotPrefixRequiresSubmodelPayload = Rule.define({
  name: 'got-prefix-requires-submodel-payload',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Reserve Got* Messages for Submodel wrappers with a { message: Child.Message } payload.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const messageUnionBindings = new Set<string>()
    return {
      Program: (node: ESTree.Node) => {
        recordFoldkitMessageUnionBindings(messageUnionBindings, node)
        return Effect.void
      },
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) return Effect.void

        return Effect.forEach(
          messageCases(node, messageUnionBindings),
          messageCase =>
            /^Got[A-Z]/.test(messageCase.name) &&
            !hasMessagePayloadProperty(messageCase.fields)
              ? ctx.report(
                  Diagnostic.make({
                    node: messageCase.nameNode,
                    message:
                      'Got* is reserved for Submodel wrappers. Add a { message: Child.Message } payload or choose a Message name that does not start with Got.',
                  }),
                )
              : Effect.void,
          { discard: true },
        )
      },
    }
  },
})
