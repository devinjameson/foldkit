import { HashSet } from 'effect'
import { Html } from 'foldkit/html'

import * as Markdown from '@foldkit/markdown'

import { type TableOfContentsEntry } from '../main'
import { type CopiedSnippets } from '../view/codeBlock'
import { docIslands } from './islands'
import { type HeadingIds, collectHeadings } from './tableOfContents'
import { docViews } from './views'

// DOC PAGE

const renderDocument = (
  document: Markdown.MarkdownDocument,
  pageId: string,
  idByHeading: HeadingIds,
  copiedSnippets: CopiedSnippets,
  demos: Demos<string>,
): Html =>
  Markdown.view(document, {
    views: docViews({ pageId, idByHeading, copiedSnippets }),
    islands: docIslands(copiedSnippets, demos),
  })

/**
 * Live demos a page embeds, keyed by the names on its `::Demo{name}` islands.
 * A record over the page's declared names rather than a string-keyed map, so a
 * missing or misspelled key is a type error where the page builds it instead of
 * a demo that silently renders nothing.
 */
export type Demos<Name extends string> = Readonly<Record<Name, Html>>

const emptyDemos: Demos<never> = {}

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

/** A markdown-backed page that embeds one or more live `::Demo` islands. */
export type DemoDocPage<Name extends string> = Readonly<{
  tableOfContents: ReadonlyArray<TableOfContentsEntry>
  view: (copiedSnippets: CopiedSnippets, demos: Demos<Name>) => Html
}>

/**
 * Like {@link docPage}, for a page that embeds live, interactive demos through
 * `::Demo{name}` islands. Name the islands the page embeds in the type argument:
 * `demoDocPage<'counter' | 'clock'>(raw, pageId)`. The page's dispatch site then
 * builds each one from Model state and passes them in by name, so the markdown
 * owns the prose and the app keeps owning the demos' Model.
 */
export const demoDocPage = <Name extends string = never>(
  raw: unknown,
  pageId: string,
): DemoDocPage<Name> => {
  const document = Markdown.decodeDocument(raw)
  const { tableOfContents, idByHeading } = collectHeadings(document)

  return {
    tableOfContents,
    view: (copiedSnippets, demos) =>
      renderDocument(document, pageId, idByHeading, copiedSnippets, demos),
  }
}

/**
 * Turns a compiled `.md` module into a page's `{ view, tableOfContents }`
 * contract. The document is decoded and its headings numbered once, at module
 * load; `pageId` becomes the `h1` anchor and search section id, matching the
 * old `pageTitle` first argument.
 */
export const docPage = (raw: unknown, pageId: string): DocPage => {
  const { tableOfContents, view } = demoDocPage(raw, pageId)

  return {
    tableOfContents,
    view: copiedSnippets => view(copiedSnippets, emptyDemos),
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
