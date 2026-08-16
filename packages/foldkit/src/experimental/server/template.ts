import type { DefaultTreeAdapterMap } from 'parse5'
import { parse } from 'parse5'

import { escapeAttributeValue, escapeText } from './serialize.js'
import { type RenderedApplication } from './server.js'

const DEFAULT_CONTAINER_ID = 'root'

// NOTE: the template's mutation targets (the container, the <title>, the
// <html> element, and the canonical/og:url head elements) are located by
// parsing the template with a real HTML tokenizer and reading each element's
// source offsets, not by matching regular expressions. A regex cannot model
// the tokenizer's states, so a `>` inside a quoted attribute, a
// canonical-looking or container-looking string inside a <script>, the
// script-data-double-escaped state, and a comment-terminating metadata value
// all let context-blind matching write request or application text into an
// executable JavaScript or unintended markup position. Parsing resolves every
// target to an actual element position; the untouched bytes of the template
// are spliced through verbatim.

type Element = DefaultTreeAdapterMap['element']
type ChildNode = DefaultTreeAdapterMap['childNode']
type Attribute = Readonly<{ name: string; value: string }>
type ParentNode = Readonly<{ childNodes: ReadonlyArray<ChildNode> }>

type Mutation = Readonly<{ start: number; end: number; replacement: string }>

const isElement = (node: ChildNode): node is Element => 'tagName' in node

const collectMatching = (
  root: ParentNode,
  predicate: (element: Element) => boolean,
): ReadonlyArray<Element> => {
  const found: Array<Element> = []
  const walk = (node: ParentNode): void => {
    for (const child of node.childNodes) {
      if (isElement(child)) {
        if (predicate(child)) {
          found.push(child)
        }
        walk(child)
      }
    }
  }
  walk(root)
  return found
}

const firstMatching = (
  root: ParentNode,
  predicate: (element: Element) => boolean,
): Element | undefined => collectMatching(root, predicate)[0]

const attributeValue = (element: Element, name: string): string | undefined =>
  element.attrs.find(attribute => attribute.name === name)?.value

const withAttribute = (
  attributes: ReadonlyArray<Attribute>,
  name: string,
  value: string,
): ReadonlyArray<Attribute> => {
  const exists = attributes.some(attribute => attribute.name === name)
  if (exists) {
    return attributes.map(attribute =>
      attribute.name === name ? { name, value } : attribute,
    )
  }
  return [...attributes, { name, value }]
}

const renderAttributes = (attributes: ReadonlyArray<Attribute>): string =>
  attributes
    .map(
      attribute =>
        ` ${attribute.name}="${escapeAttributeValue(attribute.value)}"`,
    )
    .join('')

const renderStartTag = (
  tagName: string,
  attributes: ReadonlyArray<Attribute>,
): string => `<${tagName}${renderAttributes(attributes)}>`

const renderVoidElement = (
  tagName: string,
  attributes: ReadonlyArray<Attribute>,
): string => `<${tagName}${renderAttributes(attributes)} />`

const applyMutations = (
  template: string,
  mutations: ReadonlyArray<Mutation>,
): string => {
  const ordered = [...mutations].sort((left, right) => right.start - left.start)
  let result = template
  for (const mutation of ordered) {
    result =
      result.slice(0, mutation.start) +
      mutation.replacement +
      result.slice(mutation.end)
  }
  return result
}

// A valid container is `<div id="{containerId}"></div>` with no other
// attributes and no children, so the rendered application replaces the exact
// placeholder and nothing else.
const isContainerPlaceholder = (
  element: Element,
  containerId: string,
): boolean =>
  element.tagName === 'div' &&
  element.attrs.length === 1 &&
  element.attrs[0]?.name === 'id' &&
  element.attrs[0]?.value === containerId &&
  element.childNodes.length === 0

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
 * The template is parsed with an HTML tokenizer, so every mutation targets a
 * real element rather than a byte pattern. The container contract is
 * deliberately exact: the template must contain one `<div id="root"></div>`
 * placeholder, or the equivalent for `containerId`, with no additional
 * attributes and no content. It must also contain exactly one `<title>`
 * element in its head. Throws when either required location is missing or
 * appears more than once.
 *
 * This helper is pure with no module state, so a host process may import it
 * directly even when the render itself must stay inside the server entry's
 * module graph.
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
  const document = parse(template, { sourceCodeLocationInfo: true })

  const containers = collectMatching(document, element =>
    isContainerPlaceholder(element, containerId),
  )
  if (containers.length === 0) {
    throw new Error(
      `[foldkit] injectIntoTemplate found no exact <div id="${containerId}"></div> placeholder in the template. ` +
        'Add that markup where the application root belongs, or pass the container id the template uses.',
    )
  }
  if (containers.length > 1) {
    throw new Error(
      `[foldkit] injectIntoTemplate found more than one <div id="${containerId}"></div> placeholder in the template. ` +
        'Keep exactly one placeholder for each application root.',
    )
  }

  const head = firstMatching(document, element => element.tagName === 'head')
  const titles =
    head === undefined
      ? []
      : collectMatching(head, element => element.tagName === 'title')
  if (titles.length === 0) {
    throw new Error(
      '[foldkit] injectIntoTemplate found no <title> element in the template head. ' +
        'Add exactly one <title> where the rendered Document title belongs.',
    )
  }
  if (titles.length > 1) {
    throw new Error(
      '[foldkit] injectIntoTemplate found more than one <title> element in the template head. ' +
        'Keep exactly one title for the rendered Document.',
    )
  }

  const mutations: Array<Mutation> = []

  const container = containers[0]!
  const containerLocation = container.sourceCodeLocation
  if (containerLocation != null) {
    mutations.push({
      start: containerLocation.startOffset,
      end: containerLocation.endOffset,
      replacement: rendered.html,
    })
  }

  const title = titles[0]!
  const titleLocation = title.sourceCodeLocation
  if (titleLocation?.startTag != null && titleLocation.endTag != null) {
    mutations.push({
      start: titleLocation.startTag.endOffset,
      end: titleLocation.endTag.startOffset,
      replacement: escapeText(rendered.title),
    })
  }

  const html = firstMatching(document, element => element.tagName === 'html')
  if (rendered.lang !== undefined || rendered.dir !== undefined) {
    // HTML lets the <html> start tag be omitted, in which case parse5 builds an
    // implicit html element with no start-tag location to mutate. Rather than
    // silently drop the language or direction the page requested, fail so the
    // author adds an explicit tag.
    const startTag = html?.sourceCodeLocation?.startTag
    if (html === undefined || startTag == null) {
      throw new Error(
        '[foldkit] injectIntoTemplate cannot stamp the language or direction ' +
          'because the template has no explicit <html> start tag to mutate. ' +
          'Add an <html> tag to the template so lang and dir can be set.',
      )
    }
    let attributes: ReadonlyArray<Attribute> = html.attrs
    if (rendered.lang !== undefined) {
      attributes = withAttribute(attributes, 'lang', rendered.lang)
    }
    if (rendered.dir !== undefined) {
      attributes = withAttribute(attributes, 'dir', rendered.dir)
    }
    mutations.push({
      start: startTag.startOffset,
      end: startTag.endOffset,
      replacement: renderStartTag('html', attributes),
    })
  }

  if (rendered.canonical !== undefined && head !== undefined) {
    const canonical = firstMatching(
      head,
      element =>
        element.tagName === 'link' &&
        attributeValue(element, 'rel')?.toLowerCase() === 'canonical',
    )
    if (canonical?.sourceCodeLocation != null) {
      mutations.push({
        start: canonical.sourceCodeLocation.startOffset,
        end: canonical.sourceCodeLocation.endOffset,
        replacement: renderVoidElement(
          'link',
          withAttribute(canonical.attrs, 'href', rendered.canonical),
        ),
      })
    }
  }

  if (rendered.ogUrl !== undefined && head !== undefined) {
    const ogUrl = firstMatching(
      head,
      element =>
        element.tagName === 'meta' &&
        attributeValue(element, 'property')?.toLowerCase() === 'og:url',
    )
    if (ogUrl?.sourceCodeLocation != null) {
      mutations.push({
        start: ogUrl.sourceCodeLocation.startOffset,
        end: ogUrl.sourceCodeLocation.endOffset,
        replacement: renderVoidElement(
          'meta',
          withAttribute(ogUrl.attrs, 'content', rendered.ogUrl),
        ),
      })
    }
  }

  return applyMutations(template, mutations)
}
