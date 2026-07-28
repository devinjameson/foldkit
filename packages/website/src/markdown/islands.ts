import { Option } from 'effect'
import { inertHtml as ih } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import { ctaLinks, infoCalloutBlocks, warningCalloutBlocks } from '../prose'
import { highlightedCodeBlock } from '../view/codeBlock'
import { islandAttributes } from './islandAttributes'
import { type Slots, renderFaqSection, resolveDemo } from './slots'
import { lookupSnippet } from './snippets'

// ISLANDS

const createWarnOnce = (buildMessage: (name: string) => string) => {
  const warned = new Set<string>()

  return (name: string): void => {
    if (!warned.has(name)) {
      warned.add(name)
      console.warn(buildMessage(name))
    }
  }
}

const warnMissingSnippetOnce = createWarnOnce(
  name =>
    `[docs] No snippet registered for "${name}". ` +
    'Add the file under src/snippet, or fix the ::Snippet name attribute.',
)

/**
 * The site's island views, paired with {@link islandAttributes} so attributes
 * arrive already decoded. `Snippet` renders a build-time highlighted source file
 * with the standard copy affordance; `Info` and `Warning` wrap nested markdown
 * in the prose callouts; `Cta` lays its nested links out as an action row;
 * `Demo` drops in a live, interactive demo the page has pre-built and keyed by
 * name; `Faq` hands its rendered children to the page's collapsible shell. The
 * page's slots live in the app Model, so the views close over `slots`; the copy
 * state rides inside the slots' `renderCopyButton`.
 */
export const docIslands = (slots: Slots<string>): Markdown.Islands => {
  return Markdown.islandsFor(islandAttributes, {
    Snippet: ({ name, label, class: className }) =>
      Option.match(lookupSnippet(name), {
        onNone: () => {
          warnMissingSnippetOnce(name)
          return ih.empty
        },
        onSome: snippet =>
          highlightedCodeBlock(
            ih.div(
              [ih.Class('text-sm'), ih.InnerHTML(snippet.highlighted)],
              [],
            ),
            snippet.raw,
            label === undefined
              ? 'Copy snippet to clipboard'
              : `Copy ${label} to clipboard`,
            slots.renderCopyButton,
            className ?? 'mb-8',
          ),
      }),

    Info: ({ label }, content) => infoCalloutBlocks(label, content),

    Warning: ({ label }, content) => warningCalloutBlocks(label, content),

    Cta: (_attributes, content) => ctaLinks(content),

    Demo: ({ name }) => resolveDemo(slots, name),

    Faq: ({ id, question }, content) =>
      renderFaqSection(slots, id, question, content),
  })
}
