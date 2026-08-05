import { Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { domainModuleOf } from '../domainModule.ts'
import { ELEMENT_BUILDER_NAMES } from '../elementBuilderNames.ts'
import { isCallExpression } from '../guards.ts'
import { isMCall } from '../message.ts'

// PRIMITIVES

/**
 * The TEA primitive a call declares.
 */
type TeaPrimitive =
  | Readonly<{ kind: 'message' }>
  | Readonly<{ kind: 'command' }>
  | Readonly<{ kind: 'subscription' }>
  | Readonly<{ kind: 'view'; element: string }>

const COMMAND_NAMESPACE = 'Command'

const COMMAND_DECLARATION = 'define'

const SUBSCRIPTION_NAMESPACE = 'Subscription'

// The builder bindings Foldkit views use: the `h` a view receives, and
// `inertHtml` under both its own name and the `ih` it is usually imported as.
// Pairing them with the known element names keeps the rule off pure helpers
// such as `Array.map` or `Option.filter`, whose method names collide with the
// HTML and SVG tag names a builder carries.
const BUILDER_BINDINGS: ReadonlySet<string> = new Set(['h', 'ih', 'inertHtml'])

type NamespacedCallee = Readonly<{ namespace: string; member: string }>

const namespacedCallee = (
  node: ESTree.CallExpression,
): Option.Option<NamespacedCallee> => {
  const callee = node.callee
  if (callee.type !== 'MemberExpression' || callee.computed) {
    return Option.none()
  }
  const { object, property } = callee
  return object.type === 'Identifier' && property.type === 'Identifier'
    ? Option.some({ namespace: object.name, member: property.name })
    : Option.none()
}

const teaPrimitiveOf = (
  node: ESTree.CallExpression,
): Option.Option<TeaPrimitive> => {
  if (isMCall(node)) {
    return Option.some({ kind: 'message' })
  }
  return pipe(
    namespacedCallee(node),
    Option.flatMap(({ namespace, member }) => {
      if (namespace === COMMAND_NAMESPACE && member === COMMAND_DECLARATION) {
        return Option.some({ kind: 'command' } as const)
      }
      if (namespace === SUBSCRIPTION_NAMESPACE) {
        return Option.some({ kind: 'subscription' } as const)
      }
      return BUILDER_BINDINGS.has(namespace) &&
        ELEMENT_BUILDER_NAMES.has(member)
        ? Option.some({
            kind: 'view',
            element: `${namespace}.${member}`,
          } as const)
        : Option.none()
    }),
  )
}

// MESSAGES

const PURITY_CLAUSE =
  'A domain module holds a schema and pure functions over it, which is what lets several pages share it and what lets it take ordinary tests with no runtime around them.'

const teaPrimitiveMessage = (primitive: TeaPrimitive): string => {
  switch (primitive.kind) {
    case 'message':
      return `A \`domain/\` module declares a Message with \`m(...)\`. Messages are the vocabulary of one runtime and belong beside the update that folds them. ${PURITY_CLAUSE} Return a plain value from the domain function and let the caller wrap it in a Message.`
    case 'command':
      return `A \`domain/\` module declares a Command with \`Command.define\`. A Command pairs an effect the runtime performs with the Message it sends back, so it belongs to the module that owns that Message. ${PURITY_CLAUSE} Declare the Command beside its update and expose the pure computation from here.`
    case 'subscription':
      return `A \`domain/\` module declares a Subscription. A Subscription wires an outside source into a Message stream, which is runtime plumbing rather than a domain concept. ${PURITY_CLAUSE} Declare the Subscription in the module that receives its Messages and keep this file to a schema and pure functions.`
    case 'view':
      return `A \`domain/\` module builds view markup with \`${primitive.element}(...)\`. A view renders a Model for one screen, while a domain module describes a concept every screen shares, so markup here settles a presentation question on behalf of callers that have not asked it. ${PURITY_CLAUSE} Build the markup in the page or the app view that shows it, and let this module return the values it renders.`
  }
}

// RULE

/**
 * Forbids declaring TEA primitives inside a `domain/` directory.
 *
 * A domain module describes a concept the whole application shares, so it
 * holds a schema and pure functions over it and nothing that belongs to one
 * runtime. Schema use is the point of the module and is never reported.
 */
export const noTeaPrimitivesInDomain = Rule.define({
  name: 'no-tea-primitives-in-domain',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep domain modules to a schema and pure functions. Messages, Commands, and Subscriptions belong to the module whose runtime owns them.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const isDomainFile = Option.isSome(domainModuleOf(ctx.filename))
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isDomainFile || !isCallExpression(node)) {
          return Effect.void
        }
        return pipe(
          teaPrimitiveOf(node),
          Option.match({
            onNone: () => Effect.void,
            onSome: primitive =>
              ctx.report(
                Diagnostic.make({
                  node,
                  message: teaPrimitiveMessage(primitive),
                }),
              ),
          }),
        )
      },
    }
  },
})
