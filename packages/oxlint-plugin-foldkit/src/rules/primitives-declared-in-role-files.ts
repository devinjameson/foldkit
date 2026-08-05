import { Array, Effect, Option, String, pipe } from 'effect'
import { AST, Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { helperCalleeName, isCallExpression } from '../guards.ts'
import { isMCall } from '../message.ts'

// ROLE FILES

const SEPARATOR = '/'

const MESSAGE_ROLE = 'message'

const COMMAND_ROLE = 'command'

const UPDATE_ROLE = 'update'

const SUBSCRIPTION_ROLE = 'subscription'

/**
 * The role modules the File Layout gives every app and every page folder.
 *
 * `main.ts` is deliberately absent. It is the composition root, and the
 * simplest Foldkit apps keep their whole Model, Message, update and view in
 * it, which the pattern blesses.
 */
const ROLE_NAMES: ReadonlyArray<string> = [
  'model',
  MESSAGE_ROLE,
  COMMAND_ROLE,
  UPDATE_ROLE,
  'view',
  SUBSCRIPTION_ROLE,
  'route',
  'init',
]

const TEST_MODULE_SUFFIXES: ReadonlyArray<string> = [
  'test',
  'spec',
  'story',
  'stories',
  'fixtures',
]

const toSegments = (filePath: string): ReadonlyArray<string> =>
  pipe(
    filePath.replaceAll('\\', SEPARATOR).split(SEPARATOR),
    Array.filter(segment => !String.isEmpty(segment)),
  )

const nameParts = (fileName: string): ReadonlyArray<string> =>
  fileName.split('.')

const moduleName = (fileName: string): string =>
  pipe(
    Array.head(nameParts(fileName)),
    Option.getOrElse(() => fileName),
  )

const isTestModule = (fileName: string): boolean =>
  pipe(
    nameParts(fileName),
    Array.drop(1),
    Array.dropRight(1),
    Array.some(part => Array.contains(TEST_MODULE_SUFFIXES, part)),
  )

/**
 * Read the role a file owns from its path alone.
 *
 * The path is the whole mechanism, and it is what keeps this rule inert on
 * the apps that have not split yet. A role is claimed two ways, both of which
 * the File Layout shows: the file is named for the role, as in `message.ts`,
 * or it sits in a directory named for it, as in `update/handleRoomUpdates.ts`.
 * Naming a module `view.ts` is the author saying this module holds the view
 * and nothing else, so a Message declared in it contradicts a claim the author
 * already made.
 *
 * Every other file returns none and is never reported. That covers the single
 * file app in `main.ts`, which the pattern blesses, the submodel that owns a
 * whole Model, Message, update and view in one file such as `counter.ts`, the
 * single file page such as `page/landing.ts`, and every helper module. None of
 * them claim a role, so none of them can contradict one.
 */
const roleOf = (filename: string): Option.Option<string> => {
  const segments = toSegments(filename)
  return pipe(
    Array.last(segments),
    Option.filter(fileName => !isTestModule(fileName)),
    Option.flatMap(fileName =>
      pipe(
        Option.some(moduleName(fileName)),
        Option.filter(name => Array.contains(ROLE_NAMES, name)),
        Option.orElse(() =>
          pipe(
            Array.get(segments, segments.length - 2),
            Option.filter(directory => Array.contains(ROLE_NAMES, directory)),
          ),
        ),
      ),
    ),
  )
}

// PRIMITIVES

// NOTE: only the Subscription declaration constructors. `Subscription.batch`,
// `Subscription.map` and friends compose Subscriptions declared elsewhere, and
// composing them is what an app level `main.ts` is for.
const SUBSCRIPTION_CONSTRUCTORS: ReadonlyArray<string> = [
  'make',
  'lift',
  'aggregate',
  'persistent',
]

/**
 * A Foldkit primitive declaration, paired with the roles allowed to hold it.
 *
 * `matches` returns the call as it is written, so the diagnostic can quote the
 * declaration it found rather than a generic name for it.
 */
interface Primitive {
  readonly matches: (node: ESTree.CallExpression) => Option.Option<string>
  readonly allowedRoles: ReadonlyArray<string>
  readonly message: (role: string, call: string) => string
}

const messagePrimitive: Primitive = {
  matches: node => (isMCall(node) ? Option.some('m') : Option.none()),
  allowedRoles: [MESSAGE_ROLE],
  message: (role, call) =>
    `Message constructor declared with \`${call}(...)\` in a \`${role}\` module. A page folder mirrors The Elm Architecture one part per file, so the events a page can receive are declared once in \`message.ts\` and every other role imports them from there. Declared here, the vocabulary of the page is split in two, and the update that has to handle every event no longer sits opposite one list of them. Move the declaration into \`message.ts\`, or into a \`message/\` folder, and import the constructor.`,
}

const commandPrimitive: Primitive = {
  matches: node =>
    pipe(
      AST.matchCallOf(node, 'Command', 'define'),
      Option.as('Command.define'),
    ),
  // NOTE: `update` is allowed next to `command`. The pattern says Commands
  // live beside the update function that returns them, and Foldkit's own apps
  // define their navigation Commands directly in `update.ts`. What the pattern
  // rules out is a Command declared in a role that never returns one.
  allowedRoles: [COMMAND_ROLE, UPDATE_ROLE],
  message: (role, call) =>
    `Command declared with \`${call}(...)\` in a \`${role}\` module. Commands live beside the update function that returns them, which means \`command.ts\`, or the \`update.ts\` that hands the Command back to the runtime. Declared here, the side effects this page can perform are no longer one file you can read end to end, and a page that fetches its own data stops being answerable from its \`command.ts\`. Move the declaration into \`command.ts\`, or into a \`command/\` folder, and import it.`,
}

const subscriptionPrimitive: Primitive = {
  matches: node =>
    pipe(
      AST.matchCallOf(node, 'Subscription', SUBSCRIPTION_CONSTRUCTORS),
      Option.flatMap(call => helperCalleeName(call.callee)),
      Option.map(method => `Subscription.${method}`),
    ),
  allowedRoles: [SUBSCRIPTION_ROLE],
  message: (role, call) =>
    `Subscription declared with \`${call}(...)\` in a \`${role}\` module. A page that declares its own Subscriptions gets a \`subscription.ts\` the same way it gets a \`command.ts\`, and those files compose upward, so every stream of outside events the app is listening to can be found by reading the \`subscription.ts\` files alone. Declared here, a live subscription hides in a module whose name promises something else, and nothing shows it being torn down with the page. Move the declaration into \`subscription.ts\`, or into a \`subscription/\` folder, and compose it upward from there.`,
}

const PRIMITIVES: ReadonlyArray<Primitive> = [
  messagePrimitive,
  commandPrimitive,
  subscriptionPrimitive,
]

// RULE

/**
 * Requires a Foldkit primitive to be declared in the role module that owns it:
 * Messages in `message.ts`, Commands in `command.ts` or the `update.ts` that
 * returns them, Subscriptions in `subscription.ts`.
 *
 * The rule only speaks to an app that has already split into role files, and
 * it works that out from the path of the file it is looking at rather than
 * from any project wide setting. A file named for a role, or sitting in a
 * folder named for one, has declared what it holds; a file that has not, such
 * as the `main.ts` of a single file app or a page small enough to live in one
 * module, is left alone entirely.
 */
export const primitivesDeclaredInRoleFiles = Rule.define({
  name: 'primitives-declared-in-role-files',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Declare Foldkit primitives in the role file that owns them, so a split app keeps one home per part of The Elm Architecture.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const maybeRole = roleOf(ctx.filename)
    return {
      CallExpression: (node: ESTree.Node) => {
        if (!isCallExpression(node)) {
          return Effect.void
        }
        return pipe(
          Option.all([
            maybeRole,
            Array.findFirst(PRIMITIVES, primitive =>
              pipe(
                primitive.matches(node),
                Option.map(call => ({ call, primitive })),
              ),
            ),
          ]),
          Option.filter(
            ([role, { primitive }]) =>
              !Array.contains(primitive.allowedRoles, role),
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: ([role, { call, primitive }]) =>
              ctx.report(
                Diagnostic.make({
                  node,
                  message: primitive.message(role, call),
                }),
              ),
          }),
        )
      },
    }
  },
})
