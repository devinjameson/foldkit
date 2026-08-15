import { escapeAttributeValue, escapeText } from './serialize.js'
import { type RenderedApplication } from './server.js'

const TITLE_PATTERN = /<title>[^<]*<\/title>/
const HTML_OPEN_TAG_PATTERN = /<html([^>]*)>/

// NOTE: hand-written templates use any of HTML's three attribute forms, so
// the head element matchers and the attribute stripper accept double-quoted,
// single-quoted, and unquoted values. Matching only one form would silently
// skip the element or emit a duplicate attribute whose stale first value
// wins when the browser parses the page.
const attributeWithValuePattern = (name: string, value: string): string =>
  `${name}\\s*=\\s*(?:"${value}"|'${value}'|${value}(?=[\\s/>]))`

const CANONICAL_LINK_PATTERN = new RegExp(
  `<link([^>]*${attributeWithValuePattern('rel', 'canonical')}[^>]*?)\\s*/?>`,
)
const OG_URL_META_PATTERN = new RegExp(
  `<meta([^>]*${attributeWithValuePattern('property', 'og:url')}[^>]*?)\\s*/?>`,
)

const DEFAULT_CONTAINER_ID = 'root'

const ATTRIBUTE_TOKEN_PATTERN =
  /[^\s=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g

const attributeNameOf = (token: string): string => {
  const nameMatch = /^[^\s=]+/.exec(token)
  return nameMatch === null ? token : nameMatch[0]
}

// NOTE: the attribute string is tokenized rather than searched, so an
// attribute-name lookalike inside another attribute's quoted value can
// neither be corrupted nor shadow the replacement.
const setAttribute = (
  attributes: string,
  name: string,
  value: string,
): string => {
  const tokens = attributes.match(ATTRIBUTE_TOKEN_PATTERN) ?? []
  const keptTokens = tokens.filter(
    token => attributeNameOf(token).toLowerCase() !== name.toLowerCase(),
  )
  const kept = keptTokens.map(token => ` ${token}`).join('')
  return `${kept} ${name}="${escapeAttributeValue(value)}"`
}

type TemplateRegion = Readonly<{ start: number; end: number }>

const COMMENT_PATTERN = /<!--[\s\S]*?-->/g
const HEAD_OPEN_PATTERN = /<head[^>]*>/gi
const HEAD_CLOSE_PATTERN = /<\/head>/gi

const commentRegionsOf = (template: string): ReadonlyArray<TemplateRegion> => {
  COMMENT_PATTERN.lastIndex = 0
  const regions: Array<TemplateRegion> = []
  let match = COMMENT_PATTERN.exec(template)
  while (match !== null) {
    regions.push({ start: match.index, end: match.index + match[0].length })
    match = COMMENT_PATTERN.exec(template)
  }
  return regions
}

const isInsideAny = (
  regions: ReadonlyArray<TemplateRegion>,
  index: number,
): boolean =>
  regions.some(region => index >= region.start && index < region.end)

const execOutsideRegions = (
  template: string,
  pattern: RegExp,
  excluded: ReadonlyArray<TemplateRegion>,
  fromIndex: number,
): RegExpExecArray | null => {
  pattern.lastIndex = fromIndex
  let match = pattern.exec(template)
  while (match !== null && isInsideAny(excluded, match.index)) {
    match = pattern.exec(template)
  }
  return match
}

// NOTE: title and head-element matching are scoped to the template's head
// and split at comment boundaries: an SVG accessibility <title> in the body
// is content, not the document title, and a commented-out head element must
// be left alone rather than stamped inside the comment. The head's own
// boundaries are located outside comments too, so a <head> or </head>
// inside a comment neither starts nor truncates the search. A template
// without a <head> falls back to whole-document scanning.
const headSearchRegions = (template: string): ReadonlyArray<TemplateRegion> => {
  const comments = commentRegionsOf(template)
  const headOpen = execOutsideRegions(template, HEAD_OPEN_PATTERN, comments, 0)
  const start = headOpen === null ? 0 : headOpen.index
  const headClose =
    headOpen === null
      ? null
      : execOutsideRegions(
          template,
          HEAD_CLOSE_PATTERN,
          comments,
          headOpen.index + headOpen[0].length,
        )
  const end =
    headClose === null ? template.length : headClose.index + headClose[0].length

  const regions: Array<TemplateRegion> = []
  let segmentStart = start
  for (const comment of comments) {
    if (comment.end <= start || comment.start >= end) {
      continue
    }
    regions.push({ start: segmentStart, end: comment.start })
    segmentStart = comment.end
  }
  regions.push({ start: segmentStart, end })
  return regions
}

const countInHead = (template: string, pattern: RegExp): number => {
  const globalPattern = new RegExp(pattern.source, `${pattern.flags}g`)
  return headSearchRegions(template).reduce(
    (count, region) =>
      count +
      (template.slice(region.start, region.end).match(globalPattern)?.length ??
        0),
    0,
  )
}

const replaceFirstInHead = (
  template: string,
  pattern: RegExp,
  replacer: (match: RegExpExecArray) => string,
): string => {
  for (const region of headSearchRegions(template)) {
    const segment = template.slice(region.start, region.end)
    const match = pattern.exec(segment)
    if (match !== null) {
      return (
        template.slice(0, region.start + match.index) +
        replacer(match) +
        template.slice(region.start + match.index + match[0].length)
      )
    }
  }
  return template
}

// NOTE: rewrites the `<html>` element's `lang` and `dir` from the server
// render so the served shell carries the right language on first paint,
// before the runtime boots. Only sets an attribute the render provides,
// leaving the template's value in place otherwise.
const applyRootAttributes = (
  template: string,
  lang: string | undefined,
  dir: string | undefined,
): string => {
  if (lang === undefined && dir === undefined) {
    return template
  }

  return template.replace(HTML_OPEN_TAG_PATTERN, (_match, attributes) => {
    const withLang =
      lang === undefined ? attributes : setAttribute(attributes, 'lang', lang)
    const withLangAndDir =
      dir === undefined ? withLang : setAttribute(withLang, 'dir', dir)
    return `<html${withLangAndDir}>`
  })
}

const stampCanonical = (
  template: string,
  canonical: string | undefined,
): string => {
  if (canonical === undefined) {
    return template
  }

  return replaceFirstInHead(template, CANONICAL_LINK_PATTERN, match => {
    const [, attributes] = match
    return `<link${setAttribute(attributes ?? '', 'href', canonical)} />`
  })
}

const stampOgUrl = (template: string, ogUrl: string | undefined): string => {
  if (ogUrl === undefined) {
    return template
  }

  return replaceFirstInHead(template, OG_URL_META_PATTERN, match => {
    const [, attributes] = match
    return `<meta${setAttribute(attributes ?? '', 'content', ogUrl)} />`
  })
}

const containerPlaceholder = (containerId: string): string =>
  `<div id="${containerId}"></div>`

/** Options for {@link injectIntoTemplate}.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type InjectIntoTemplateOptions = Readonly<{
  /** The `id` of the exact `<div id="..."></div>` placeholder the rendered
   *  markup replaces. Defaults to `'root'`. */
  containerId?: string
}>

/**
 * Places a rendered page into an HTML template.
 *
 * The rendered markup (root element plus the flags payload script) replaces
 * the empty container element, so the booting runtime finds the root by its
 * `data-foldkit-app` stamp and hydrates in place. The `Document` head fields
 * are stamped into the shell so the served HTML is correct before the runtime
 * boots: `title` replaces the `<title>` text, `lang` and `dir` are set on the
 * `<html>` element, `canonical` replaces the `href` of a
 * `<link rel="canonical">` element, and `ogUrl` replaces the `content` of a
 * `<meta property="og:url">` element. A field the render omits, or a head
 * element the template does not carry, leaves the template untouched at that
 * spot.
 *
 * The container contract is deliberately exact. The template must contain
 * one `<div id="root"></div>` placeholder, or the equivalent exact markup for
 * `containerId`, with no additional attributes or whitespace inside it. It
 * must also contain exactly one `<title>` element. Throws when either required
 * location is missing or appears more than once.
 *
 * This helper is pure string work with no module state, so a host process may
 * import it directly even when the render itself must stay inside the server
 * entry's module graph.
 *
 * @example
 * ```typescript
 * const page = injectIntoTemplate(template, rendered)
 * ```
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export const injectIntoTemplate = (
  template: string,
  rendered: RenderedApplication,
  options?: InjectIntoTemplateOptions,
): string => {
  const containerId = options?.containerId ?? DEFAULT_CONTAINER_ID
  const placeholder = containerPlaceholder(containerId)

  if (!template.includes(placeholder)) {
    throw new Error(
      `[foldkit] injectIntoTemplate found no exact ${placeholder} placeholder in the template. ` +
        'Add that markup where the application root belongs, or pass the container id the template uses.',
    )
  }

  if (template.replace(placeholder, '').includes(placeholder)) {
    throw new Error(
      `[foldkit] injectIntoTemplate found more than one ${placeholder} placeholder in the template. ` +
        'Keep exactly one placeholder for each application root.',
    )
  }

  const titleCount = countInHead(template, TITLE_PATTERN)
  if (titleCount === 0) {
    throw new Error(
      '[foldkit] injectIntoTemplate found no <title> element in the template head. ' +
        'Add exactly one <title> where the rendered Document title belongs.',
    )
  }

  if (titleCount > 1) {
    throw new Error(
      '[foldkit] injectIntoTemplate found more than one <title> element in the template head. ' +
        'Keep exactly one title for the rendered Document.',
    )
  }

  const withHeadFields = stampOgUrl(
    stampCanonical(
      applyRootAttributes(template, rendered.lang, rendered.dir),
      rendered.canonical,
    ),
    rendered.ogUrl,
  )

  // NOTE: the body replacement is passed as a function. A string second
  // argument to `String.replace` treats `$&`, `$\``, `$'`, and `$$` as
  // insertion patterns, so a `$` sequence in the rendered markup would
  // corrupt the output; a replacer function inserts its return value
  // verbatim. `replaceFirstInHead` splices without insertion patterns.
  return replaceFirstInHead(
    withHeadFields,
    TITLE_PATTERN,
    () => `<title>${escapeText(rendered.title)}</title>`,
  ).replace(placeholder, () => rendered.html)
}
