import { HashSet } from 'effect'
import { Html } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import { type TableOfContentsEntry } from '../main'
import { type CopiedSnippets } from '../view/codeBlock'
import { docIslands } from './islands'
import { type Slots, emptySlots } from './slots'
import { type HeadingIds, collectHeadings } from './tableOfContents'
import { docViews } from './views'

// DOC PAGE

const renderDocument = (
  document: Markdown.MarkdownDocument,
  pageId: string,
  idByHeading: HeadingIds,
  copiedSnippets: CopiedSnippets,
  slots: Slots<string>,
): Html =>
  Markdown.view(document, {
    views: docViews({
      pageId,
      idByHeading,
      copiedSnippets,
      renderCopyButton: slots.renderCopyButton,
      renderHeadingLink: slots.renderHeadingLink,
    }),
    islands: docIslands(copiedSnippets, slots),
  })

/** A markdown-backed page that renders code snippets, so it takes copy state. */
export type DocPage = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: (copiedSnippets: CopiedSnippets) => Html
}>

/** A markdown-backed page with no interactive content. */
export type ProseDocPage = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: () => Html
}>

/** A markdown-backed page whose markdown has slots the page itself fills. */
export type SlotDocPage<DemoName extends string> = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: (copiedSnippets: CopiedSnippets, slots: Slots<DemoName>) => Html
}>

/**
 * Like {@link docPage}, for a page whose markdown carries interactive islands the
 * page has to fill in. Name the `::Demo` islands it embeds in the type argument:
 * `slotDocPage<'counter' | 'clock'>(raw, pageId)`. The page's dispatch site then
 * builds each one from Model state and passes them in by name, so the markdown
 * owns the prose and the app keeps owning the islands' Model.
 */
export const slotDocPage = <DemoName extends string = never>(
  raw: unknown,
  pageId: string,
): SlotDocPage<DemoName> => {
  const document = Markdown.decodeDocument(raw)
  const { tableOfContents, idByHeading } = collectHeadings(document)

  return {
    tableOfContents,
    view: (copiedSnippets, slots) =>
      renderDocument(document, pageId, idByHeading, copiedSnippets, slots),
  }
}

/**
 * Turns a compiled `.md` module into a page's `{ view, tableOfContents }`
 * contract. The document is decoded and its headings numbered once, at module
 * load; `pageId` becomes the `h1` anchor and search section id, matching the
 * old `pageTitle` first argument.
 */
export const docPage = (raw: unknown, pageId: string): DocPage => {
  const { tableOfContents, view } = slotDocPage(raw, pageId)

  return {
    tableOfContents,
    view: copiedSnippets => view(copiedSnippets, emptySlots),
  }
}

/**
 * Like {@link docPage}, for pages that are pure prose. The view takes no
 * arguments, so the existing dispatch site that calls `view()` is unchanged.
 */
export const proseDocPage = (raw: unknown, pageId: string): ProseDocPage => {
  const { tableOfContents, view } = docPage(raw, pageId)

  return {
    tableOfContents,
    view: () => view(HashSet.empty()),
  }
}
