import { Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import {
  type UpwardImportTarget,
  domainModuleOf,
  upwardImportTarget,
} from '../domainModule.ts'
import { importSource } from '../guards.ts'

// RULE

const upwardImportMessage = (
  target: UpwardImportTarget,
  specifier: string,
): string =>
  target.kind === 'page'
    ? `A \`domain/\` module imports a page (\`${specifier}\`). Domain is the bottom layer: pages and the app import it, and it imports nothing of theirs. Reaching back up ties a concept the whole app shares to one route, so the module can no longer be read or tested without that page loaded beside it. Move what this module needs into \`domain/\`, or take it as a parameter and let the page pass it in.`
    : `A \`domain/\` module imports the app level \`${target.role}\` (\`${specifier}\`). A domain module holds a schema and pure functions that the rest of the app is built from, so importing \`${target.role}\` closes a cycle and pulls the whole application into every test of this module. Let \`${target.role}\` call into the domain instead, and take anything else this module needs as an argument.`

/**
 * Forbids a file inside a `domain/` directory from importing a page module or
 * an app level role module.
 *
 * Domain is the bottom layer of a Foldkit application. Pages and the app
 * import it, and it imports nothing of theirs, which is what keeps a domain
 * module readable on its own and testable with ordinary tests.
 */
export const noUpwardImportsInDomain = Rule.define({
  name: 'no-upward-imports-in-domain',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep domain modules at the bottom of the import graph. A domain module never imports a page or the app level update, view, main, message, command, or subscription.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const maybeDomain = domainModuleOf(ctx.filename)
    return {
      ImportDeclaration: (node: ESTree.Node) =>
        pipe(
          Option.all([maybeDomain, importSource(node)]),
          Option.flatMap(([domain, specifier]) =>
            pipe(
              upwardImportTarget(domain, specifier),
              Option.map(target => ({ specifier, target })),
            ),
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ specifier, target }) =>
              ctx.report(
                Diagnostic.make({
                  node,
                  message: upwardImportMessage(target, specifier),
                }),
              ),
          }),
        ),
    }
  },
})
