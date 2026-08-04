import { Effect, Option, pipe } from 'effect'
import { Diagnostic, type ESTree, Rule, RuleContext } from 'effect-oxlint'

import { importSource } from '../guards.ts'
import { crossPageImportTarget, pageModuleOf } from '../pageModule.ts'

// RULE

const BARREL_NAME = 'index'

const crossPageImportMessage = (
  pageName: string,
  targetName: string,
  specifier: string,
): string =>
  targetName === BARREL_NAME
    ? `Page module \`${pageName}\` imports the page barrel (\`${specifier}\`), which re-exports every page including this one. Import the specific module you need, and when that module belongs to another page, move it to a shared module such as \`domain/\` instead.`
    : `Page module \`${pageName}\` imports from page module \`${targetName}\` (\`${specifier}\`). Pages are siblings, not a hierarchy, so one page reaching into another couples two routes and leaves neither testable on its own. Move what both need to a shared module such as \`domain/\`, or lift it to the app level and pass it down through view inputs.`

/**
 * Forbids a file inside one page module from importing another page module.
 *
 * Pages compose upward. The app imports its pages, a page never imports a
 * sibling. Shared code belongs in a domain module or at the app level.
 */
export const noCrossPageImports = Rule.define({
  name: 'no-cross-page-imports',
  meta: Rule.meta({
    type: 'suggestion',
    description:
      'Keep page modules independent of each other. Share through a domain module or the app level instead.',
  }),
  create: function* () {
    const ctx = yield* RuleContext
    const maybePage = pageModuleOf(ctx.filename)
    return {
      ImportDeclaration: (node: ESTree.Node) =>
        pipe(
          Option.all([maybePage, importSource(node)]),
          Option.flatMap(([page, specifier]) =>
            pipe(
              crossPageImportTarget(page, specifier),
              Option.map(target => ({ page, specifier, target })),
            ),
          ),
          Option.match({
            onNone: () => Effect.void,
            onSome: ({ page, specifier, target }) =>
              ctx.report(
                Diagnostic.make({
                  node,
                  message: crossPageImportMessage(page.name, target, specifier),
                }),
              ),
          }),
        ),
    }
  },
})
