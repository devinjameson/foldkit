import { Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { importSource } from '../guards.ts'
import { appCompositionImportTarget, pageFileOf } from '../pageModule.ts'

// RULE

const appCompositionImportMessage = (role: string, specifier: string): string =>
  `A page imports the app level \`${role}\` (\`${specifier}\`). Composition runs one way: the app's \`${role}\` folds its pages in, so a page that imports it closes a cycle and drags the whole app into the page's own tests. Take what the page needs as an argument, through init, a Message, or a view input.`

/**
 * Forbids a file inside a page container from importing the app level
 * `update` or `view` module.
 *
 * The app composes its pages. A page reaching back into that composition
 * inverts the direction and creates an import cycle.
 */
export const noAppUpdateOrViewImportInPage = Rule.define({
  name: 'no-app-update-or-view-import-in-page',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      "Keep composition one way. A page never imports the app's update or view.",
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const maybePageFile = pageFileOf(ctx.filename)
    return {
      ImportDeclaration: (node: ESTree.Node) =>
        pipe(
          Option.all([maybePageFile, importSource(node)]),
          Option.flatMap(([pageFile, specifier]) =>
            pipe(
              appCompositionImportTarget(pageFile, specifier),
              Option.map(role => ({ role, specifier })),
            ),
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ role, specifier }) =>
              ctx.report(
                Diagnostic.make({
                  node,
                  message: appCompositionImportMessage(role, specifier),
                }),
              ),
          }),
        ),
    }
  },
})
