import {
  Array,
  Match as M,
  Option,
  Predicate,
  String,
  flow,
  pipe,
} from 'effect'
import type { Html } from 'foldkit/html'

import type { Inline } from '@foldkit/markdown'

// SLUG

/**
 * Flattens inline markdown content to its plain text, dropping formatting. Used
 * to derive heading ids, heading aria labels, and table of contents entry text
 * from a heading's inline content.
 */
export const inlineToText = (content: ReadonlyArray<Inline>): string =>
  pipe(
    content,
    Array.map(inline =>
      M.value(inline).pipe(
        M.withReturnType<string>(),
        M.tagsExhaustive({
          Text: ({ value }) => value,
          InlineCode: ({ value }) => value,
          HardBreak: () => ' ',
          Emphasis: ({ content }) => inlineToText(content),
          Strong: ({ content }) => inlineToText(content),
          Strikethrough: ({ content }) => inlineToText(content),
          Link: ({ content }) => inlineToText(content),
          Image: ({ alt }) => alt,
        }),
      ),
    ),
    Array.join(''),
  )

/**
 * Derives a URL fragment id from heading text: lowercased, with every run of
 * non-alphanumeric characters collapsed to a single dash and surrounding dashes
 * trimmed. `"HTTP Requests"` becomes `"http-requests"`.
 */
export const slugify: (text: string) => string = flow(
  String.toLowerCase,
  String.replaceAll(/[^a-z0-9]+/g, '-'),
  String.replaceAll(/^-+|-+$/g, ''),
)

const headingIdOverridePattern = /^(.*?)\s*\{#([A-Za-z0-9-]+)\}$/

/**
 * Reads an optional trailing `{#custom-id}` override off a heading's plain text.
 * `"createLazy {#create-lazy}"` returns `{ maybeId: Some("create-lazy"), text:
 * "createLazy" }`; text with no marker returns `{ maybeId: None, text: <the whole
 * heading> }`. The override pins an anchor that `slugify` alone would not produce.
 */
export const parseHeadingId = (
  raw: string,
): Readonly<{ maybeId: Option.Option<string>; text: string }> =>
  Option.match(String.match(headingIdOverridePattern)(raw), {
    onNone: () => ({ maybeId: Option.none(), text: raw }),
    onSome: ([, base = raw, id]) => ({
      maybeId: Option.fromNullishOr(id),
      text: base,
    }),
  })

const headingIdMarkerSuffixPattern = /\s*\{#[A-Za-z0-9-]+\}$/

/**
 * Drops a trailing `{#custom-id}` marker from a heading's rendered inline content,
 * leaving inline formatting intact. The marker is plain text, so it is always the
 * final string element: `["Use ", codeHtml, " {#lazy}"]` becomes `["Use ",
 * codeHtml]`.
 */
export const stripHeadingIdMarker = (
  content: ReadonlyArray<Html | string>,
): ReadonlyArray<Html | string> =>
  Array.matchRight(content, {
    onEmpty: () => content,
    onNonEmpty: (init, last) => {
      if (Predicate.isString(last)) {
        const stripped = String.replace(headingIdMarkerSuffixPattern, '')(last)
        return String.isEmpty(stripped) ? init : Array.append(init, stripped)
      } else {
        return content
      }
    },
  })
