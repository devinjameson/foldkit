import { Array as Array_ } from 'effect'

import {
  HYDRATION_IDENTITY_ATTRIBUTE,
  HYDRATION_KEY_ATTRIBUTE,
  hydrationIdentityMarker,
  hydrationKeyMarker,
} from '../../hydrationMarkers.js'
import {
  hasTrustedInnerHtml,
  isClientOnlyProperty,
} from '../../propertyProvenance.js'
import type { VNode } from '../../snabbdom/vnode.js'
import { tagNameFromSelector } from '../../tagName.js'

/** Extra attributes appended to the serialized root element, used by
 *  `renderToString` to stamp the hydration marker without threading
 *  server-only concerns through view code. Root attributes are applied after
 *  the vnode's own data, so the stamp always wins over a same-named
 *  attribute in the view.
 *
 * `emitHydrationMarkers` turns on the key and identity markers hydration
 * verifies adoption against. They are part of the hydration handoff, so a
 * render nobody will hydrate carries none of them.
 *
 * @internal Not part of the `foldkit/experimental/server` surface; `renderToString` is the public entry to serialization.
 */
export type SerializeOptions = Readonly<{
  rootAttributes?: Readonly<Record<string, string>>
  emitHydrationMarkers?: boolean
}>

type SerializeContext = Readonly<{ emitHydrationMarkers: boolean }>

const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
])

const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set([
  'iframe',
  'noscript',
  'script',
  'style',
])

// NOTE: raw-text elements parse their content as text until the first
// `</tagname`, so HTML entities are not decoded and a closing-tag sequence in
// the content ends the element early. Escaping a text child, correct for a
// normal element, is wrong here: the browser reads the escaped `&lt;` back as
// the literal characters, not `<`, so the server DOM text disagrees with the
// view. The content is therefore emitted verbatim, and a closing-tag sequence,
// which would break out into live markup on the server, is a hard error since
// there is no valid escaping for it. `<noscript>` is raw text only while
// scripting is enabled, the hydrating client's state, so plain text round-trips
// verbatim. With scripting disabled, the state noscript targets, a browser
// parses noscript content as ordinary HTML, so a `<` in its text would become
// live markup; text carrying one is refused (see `assertNoscriptTextIsSafe`).
// Element children it cannot represent still fail the structure check, and
// intended fallback markup is authored through `h.InnerHTML`.
const rawTextClosingSequence = (tagName: string): RegExp =>
  new RegExp(`</${tagName}(?=[\\t\\n\\f\\r />]|$)`, 'i')

// NOTE: `<script>` content has more parser states than the closing-tag check
// covers. A `<!--` sequence moves the tokenizer into the script-data-escaped
// state, and a following `<script` moves it into script-data-double-escaped,
// where the serializer's own `</script>` no longer closes the element and
// the rest of the document is swallowed as script text. There is no escaping
// for it, so it is refused the same way the closing-tag sequence is.
const SCRIPT_ESCAPE_OPENER = /<!--/

const assertRawTextIsSafe = (tagName: string, content: string): void => {
  if (rawTextClosingSequence(tagName).test(content)) {
    throw new Error(
      `[foldkit] <${tagName}> content contains a </${tagName} sequence, ` +
        'which cannot be represented in a raw-text element and would break ' +
        'out of the tag when the HTML is parsed. Remove the closing-tag ' +
        'sequence from the content.',
    )
  }
  if (
    tagName.toLowerCase() === 'script' &&
    SCRIPT_ESCAPE_OPENER.test(content)
  ) {
    throw new Error(
      '[foldkit] <script> content contains a <!-- sequence, which moves the ' +
        'HTML parser into a script-data-escaped state where the closing ' +
        '</script> tag no longer ends the element. Remove the <!-- sequence ' +
        'from the content.',
    )
  }
}

// NOTE: `<noscript>` is raw text only with scripting enabled. With scripting
// disabled, the state noscript exists for, a browser parses its content as HTML,
// so markup-significant text (a `<meta>`, `<style>`, `<iframe>`, `<form>`, or an
// image with an `onerror`) would become live for exactly the users noscript
// targets. Plain text without a `<` is identical in both parser modes and safe;
// text carrying a `<` is refused. Intended fallback markup is authored through
// `h.InnerHTML`, which is trusted and rendered as raw HTML.
// A `<` opens a tag, comment, or end tag only when followed by an ASCII letter,
// `!`, `/`, or `?`. A bare `<` (as in `a < b` or `<3`) is literal text in both
// parser modes, so it is left alone.
const NOSCRIPT_MARKUP_OPENER = /<[A-Za-z!/?]/
const assertNoscriptTextIsSafe = (content: string): void => {
  if (NOSCRIPT_MARKUP_OPENER.test(content)) {
    throw new Error(
      '[foldkit] <noscript> text content contains markup (a "<" that opens a ' +
        'tag or comment), which a browser with scripting disabled parses as ' +
        'live markup. Remove the markup, or author trusted fallback markup with ' +
        'h.InnerHTML.',
    )
  }
}

// NOTE: comment text has no escaping either: it ends at the first `-->` or
// `--!>`, and must not start with `>` or `->` nor end with `<!-`. A
// terminating sequence in the text would break out of the comment into live
// markup on the server, so it is refused the same way raw-text content is.
const COMMENT_TERMINATOR = /--!?>/

const assertCommentTextIsSafe = (text: string): void => {
  if (
    text.startsWith('>') ||
    text.startsWith('->') ||
    COMMENT_TERMINATOR.test(text) ||
    text.endsWith('<!-')
  ) {
    throw new Error(
      '[foldkit] comment content contains a sequence that would terminate ' +
        'the comment when the HTML is parsed. Remove the sequence from the ' +
        'content.',
    )
  }
}

const BOOLEAN_PROPERTIES: ReadonlySet<string> = new Set([
  'autofocus',
  'autoplay',
  'checked',
  'controls',
  'disabled',
  'formNoValidate',
  'hidden',
  'inert',
  'isMap',
  'loop',
  'multiple',
  'muted',
  'noValidate',
  'open',
  'playsInline',
  'readOnly',
  'required',
  'reversed',
  'selected',
])

const RENAMED_PROPERTY_ATTRIBUTES: Readonly<Record<string, string>> = {
  colSpan: 'colspan',
  dateTime: 'datetime',
  formAction: 'formaction',
  formEnctype: 'formenctype',
  formMethod: 'formmethod',
  formNoValidate: 'formnovalidate',
  formTarget: 'formtarget',
  htmlFor: 'for',
  isMap: 'ismap',
  maxLength: 'maxlength',
  minLength: 'minlength',
  noValidate: 'novalidate',
  playsInline: 'playsinline',
  readOnly: 'readonly',
  rowSpan: 'rowspan',
  tabIndex: 'tabindex',
}

const PASSTHROUGH_PROPERTIES: ReadonlySet<string> = new Set([
  'accept',
  'action',
  'alt',
  'autocomplete',
  'cite',
  'cols',
  'dir',
  'download',
  'enctype',
  'high',
  'href',
  'id',
  'label',
  'lang',
  'low',
  'max',
  'method',
  'min',
  'name',
  'optimum',
  'pattern',
  'placeholder',
  'poster',
  'preload',
  'rel',
  'rows',
  'size',
  'span',
  'src',
  'start',
  'step',
  'target',
  'title',
  'type',
  'value',
  'wrap',
])

// The property names that are universal HTML global attributes. On a custom
// element they reflect to the server markup only when a typed attribute builder
// wrote them, because the name alone does not say what the property is: `h.Id`
// sets the reflected `id` attribute every element has, while a
// `CustomElement.define` property that happens to be named `id` is a
// component-private value that never becomes markup, and is marked client-only
// where it is written. Every other property on a
// custom element is a client-only DOM property, not markup, so it must not
// reflect through the native property maps below (which would emit, for example,
// `value` from a custom element property that shadows the native input
// property).
const GLOBAL_ATTRIBUTE_PROPERTIES: ReadonlySet<string> = new Set([
  'id',
  'title',
  'lang',
  'dir',
  'tabIndex',
  'hidden',
  'inert',
  'draggable',
])

const STYLE_LIFECYCLE_KEYS: ReadonlySet<string> = new Set([
  'delayed',
  'remove',
  'destroy',
])

const CAPS_REGEX = /[A-Z]/g
const ATTRIBUTE_NAME_PATTERN = /^[A-Za-z_:][A-Za-z0-9_.:-]*$/

// NOTE: the tag name is written verbatim into the opening and closing markup,
// so it must not carry markup-significant characters. CustomElement.define
// only checks that a tag contains a hyphen, so a string such as
// `x-a><script>` would pass validation and inject live elements. This is the
// serializer's own defense: any tag it cannot represent as a bare name is a
// hard error rather than emitted markup.
const TAG_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9._-]*$/

// NOTE: `\r` is escaped because the HTML parser normalizes CR and CRLF to LF
// before tokenization; a verbatim carriage return would read back as a
// different string and guarantee a hydration mismatch. The entity survives
// tokenization and decodes back to the original character.
const TEXT_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '\r': '&#13;',
}

const ATTRIBUTE_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '"': '&quot;',
  '<': '&lt;',
  // As in text, a carriage return is normalized away (CR and CRLF collapse to LF
  // before tokenization) unless encoded as a character reference, which decodes
  // back to the original after normalization.
  '\r': '&#13;',
}

// NUL (U+0000) has no HTML representation: the tokenizer replaces it with U+FFFD
// or drops it, so it can never round-trip. It is rejected wherever a value is
// escaped for output rather than silently corrupted.
const assertNoNul = (value: string, context: string): void => {
  if (value.includes('\u0000')) {
    throw new Error(
      `[foldkit] ${context} contains a NUL (U+0000) character, which has no ` +
        'HTML representation and cannot round-trip. Remove it from the value.',
    )
  }
}

/** Escapes a string for use as HTML text content.
 *
 * @internal Shared with the template injector; not part of the `foldkit/experimental/server` surface.
 */
export const escapeText = (value: string): string => {
  assertNoNul(value, 'text content')
  return value.replace(
    /[&<>\r]/g,
    character => TEXT_ESCAPES[character] ?? character,
  )
}

/** Escapes a string for use inside a double-quoted HTML attribute value.
 *
 * @internal Shared with the template injector; not part of the `foldkit/experimental/server` surface.
 */
export const escapeAttributeValue = (value: string): string => {
  assertNoNul(value, 'attribute value')
  return value.replace(
    /[&"<\r]/g,
    character => ATTRIBUTE_ESCAPES[character] ?? character,
  )
}

const toKebabCase = (value: string): string =>
  value.replace(CAPS_REGEX, '-$&').toLowerCase()

const setAttribute = (
  attributes: Map<string, string>,
  name: string,
  value: string,
): void => {
  if (!ATTRIBUTE_NAME_PATTERN.test(name)) {
    throw new Error(
      `[foldkit] Cannot serialize the invalid attribute name "${name}". ` +
        'Attribute names must use letters, numbers, underscores, periods, colons, and hyphens, and must not start with a number.',
    )
  }
  attributes.set(name, value)
}

const appendClass = (
  attributes: Map<string, string>,
  addition: string,
): void => {
  const existing = attributes.get('class')
  const nextClass =
    existing === undefined || existing === ''
      ? addition
      : `${existing} ${addition}`
  attributes.set('class', nextClass)
}

const appendStyle = (
  attributes: Map<string, string>,
  addition: string,
): void => {
  const existing = attributes.get('style')
  const separator =
    existing === undefined || existing === '' || existing.endsWith(';')
      ? ''
      : '; '
  attributes.set(
    'style',
    existing === undefined ? addition : `${existing}${separator}${addition}`,
  )
}

const collectDataAttributes = (
  attributes: Map<string, string>,
  data: NonNullable<VNode['data']>,
): void => {
  const isForeignNamespace = data.ns !== undefined
  const plainAttributes = data.attrs
  if (plainAttributes !== undefined) {
    for (const rawName of Object.keys(plainAttributes)) {
      const value = plainAttributes[rawName]
      const name = isForeignNamespace ? rawName : rawName.toLowerCase()
      if (value === true) {
        setAttribute(attributes, name, '')
      } else if (value !== false && value !== undefined) {
        if (name === 'class') {
          appendClass(attributes, String(value))
        } else if (name === 'style') {
          appendStyle(attributes, String(value))
        } else {
          setAttribute(attributes, name, String(value))
        }
      }
    }
  }

  const classes = data.class
  if (classes !== undefined) {
    const activeClasses = Object.keys(classes).filter(
      className => classes[className] === true,
    )
    if (Array_.isArrayNonEmpty(activeClasses)) {
      appendClass(attributes, activeClasses.join(' '))
    }
  }

  const dataset = data.dataset
  if (dataset !== undefined) {
    for (const name of Object.keys(dataset)) {
      const value = dataset[name]
      if (value !== undefined) {
        setAttribute(attributes, `data-${toKebabCase(name)}`, value)
      }
    }
  }
}

const collectPropertyAttributes = (
  attributes: Map<string, string>,
  tagName: string,
  properties: Readonly<Record<string, unknown>>,
  isCustomElement: boolean,
): void => {
  for (const name of Object.keys(properties)) {
    const value = properties[name]
    if (value === undefined || name === 'innerHTML') {
      continue
    }
    if (
      isCustomElement &&
      !(
        GLOBAL_ATTRIBUTE_PROPERTIES.has(name) &&
        !isClientOnlyProperty(properties, name)
      )
    ) {
      continue
    }
    // NOTE: `value` on textarea/output/select is not a serializable attribute
    // (textarea and output render it as text content, select reflects the
    // selected option), and on an input an empty value matches the element's
    // default so the attribute is redundant. It stays meaningful elsewhere,
    // e.g. `<option value="">`.
    if (
      name === 'value' &&
      (tagName === 'textarea' ||
        tagName === 'output' ||
        tagName === 'select' ||
        (tagName === 'input' && value === ''))
    ) {
      continue
    }
    if (BOOLEAN_PROPERTIES.has(name)) {
      if (value === true) {
        setAttribute(attributes, RENAMED_PROPERTY_ATTRIBUTES[name] ?? name, '')
      }
    } else if (name === 'draggable') {
      setAttribute(attributes, name, value === true ? 'true' : 'false')
    } else if (name in RENAMED_PROPERTY_ATTRIBUTES) {
      setAttribute(
        attributes,
        RENAMED_PROPERTY_ATTRIBUTES[name] ?? name,
        String(value),
      )
    } else if (PASSTHROUGH_PROPERTIES.has(name)) {
      setAttribute(attributes, name, String(value))
    }
  }
}

const collectStyleAttribute = (
  attributes: Map<string, string>,
  style: Readonly<Record<string, unknown>>,
): void => {
  const declarations: Array<string> = []
  for (const name of Object.keys(style)) {
    if (STYLE_LIFECYCLE_KEYS.has(name)) {
      continue
    }
    const value = style[name]
    if (typeof value !== 'string' || value === '') {
      continue
    }
    const propertyName = name.startsWith('--') ? name : toKebabCase(name)
    declarations.push(`${propertyName}: ${value}`)
  }
  if (Array_.isArrayNonEmpty(declarations)) {
    appendStyle(attributes, declarations.join('; '))
  }
}

const serializeAttributes = (
  output: Array<string>,
  attributes: Map<string, string>,
): void => {
  for (const [name, value] of attributes) {
    output.push(` ${name}="${escapeAttributeValue(value)}"`)
  }
}

// The text a controlled `<textarea>` or `<output>` serializes: its `value` prop
// when set, or `undefined` when the element is uncontrolled and its children are
// its content. Exported so the render-time structure check can predict the text
// content the serializer produces without re-deriving the rule.
export const controlledValueContent = (
  properties: Readonly<Record<string, unknown>> | undefined,
): string | undefined => {
  const value = properties?.['value']
  if (typeof value === 'string') {
    return value
  }
  return undefined
}

const collectRawText = (node: VNode): string => {
  if (node.text !== undefined) {
    return node.text
  }
  if (node.children === undefined) {
    return ''
  }
  const parts: Array<string> = []
  for (const child of node.children) {
    if (typeof child === 'string') {
      parts.push(child)
    } else if (child.text !== undefined) {
      parts.push(child.text)
    }
  }
  return parts.join('')
}

// NOTE: the HTML parser drops a single newline immediately after the start
// tag of <textarea>, <pre>, and <listing>, so serialized content that starts
// with one needs an extra newline to survive the round-trip.
const NEWLINE_DROPPING_ELEMENTS: ReadonlySet<string> = new Set([
  'pre',
  'listing',
])

// The text the serialized content begins with, used to decide whether a
// newline-dropping element (`pre`, `listing`, `textarea`) needs an extra
// leading newline to survive the parser's leading-newline strip. Empty string
// children and empty text VNodes serialize to nothing, so they are skipped to
// reach the first run that actually emits text. The scan stops at the first
// element or comment: past it the serialized content no longer begins with
// text, so no padding is needed.
const leadingTextOf = (node: VNode): string | undefined => {
  if (node.text !== undefined) {
    return node.text
  }
  for (const child of node.children ?? []) {
    if (typeof child === 'string') {
      if (child !== '') {
        return child
      }
      continue
    }
    const selector = child.sel
    if (selector === undefined || selector === '') {
      const text = child.text ?? ''
      if (text !== '') {
        return text
      }
      continue
    }
    return undefined
  }
  return undefined
}

// NOTE: the serializer recurses per element, so a tree nested thousands of
// elements deep, typically from mapping untrusted hierarchical data straight
// to markup, would exhaust the call stack. The depth is bounded well above any
// real view and refused past the limit, so a hostile input becomes a typed
// SerializationError rather than a stack overflow.
const MAX_RENDER_DEPTH = 1000

// A controlled `<select>`'s value plus whether an option has already claimed the
// selection. The DOM `value` setter selects only the first option whose value
// matches, so the first match consumes the selection and later equal-valued
// options stay unselected. A shared mutable holder threads that "already
// consumed" fact through the select's option descendants.
type SelectSelection = { value: string; consumed: boolean }

const serializeChildren = (
  output: Array<string>,
  context: SerializeContext,
  node: VNode,
  depth: number,
  selectValue?: SelectSelection,
): void => {
  const children = node.children
  if (children !== undefined) {
    for (const child of children) {
      serializeNode(output, context, child, depth + 1, undefined, selectValue)
    }
  } else if (node.text !== undefined) {
    output.push(escapeText(node.text))
  }
}

// NOTE: an option without a value prop falls back to its label the way the
// DOM does: `option.value` reflects the text content with ASCII whitespace
// stripped and internal runs collapsed, so a label wrapped across source
// lines still matches the select value.
const optionValue = (node: VNode): string => {
  const value = node.data?.props?.['value']
  if (typeof value === 'string') {
    return value
  }
  return collectRawText(node)
    .replace(/[\t\n\f\r ]+/g, ' ')
    .trim()
}

const selectValueForChildren = (
  tagName: string,
  node: VNode,
  inherited: SelectSelection | undefined,
): SelectSelection | undefined => {
  if (tagName !== 'select') {
    return inherited
  }
  const value = node.data?.props?.['value']
  if (typeof value === 'string') {
    return { value, consumed: false }
  }
  return undefined
}

const serializeElement = (
  output: Array<string>,
  context: SerializeContext,
  node: VNode,
  selector: string,
  depth: number,
  extraAttributes?: Readonly<Record<string, string>>,
  selectValue?: SelectSelection,
): void => {
  const tagName = tagNameFromSelector(selector)
  if (!TAG_NAME_PATTERN.test(tagName)) {
    throw new Error(
      `[foldkit] Cannot serialize the invalid tag name "${tagName}". Tag ` +
        'names must start with a letter and use only letters, numbers, ' +
        'hyphens, dots, and underscores.',
    )
  }
  const data = node.data
  const isForeignNamespace = data?.ns !== undefined
  const isCustomElement = !isForeignNamespace && tagName.includes('-')

  const attributes = new Map<string, string>()

  if (data !== undefined) {
    collectDataAttributes(attributes, data)
    const properties = data.props
    if (properties !== undefined) {
      collectPropertyAttributes(
        attributes,
        tagName,
        properties,
        isCustomElement,
      )
    }
    const style = data.style
    if (style !== undefined) {
      collectStyleAttribute(attributes, style)
    }
  }

  if (
    !isForeignNamespace &&
    tagName === 'option' &&
    selectValue !== undefined &&
    !selectValue.consumed &&
    optionValue(node) === selectValue.value
  ) {
    setAttribute(attributes, 'selected', '')
    selectValue.consumed = true
  }

  if (extraAttributes !== undefined) {
    for (const name of Object.keys(extraAttributes)) {
      const value = extraAttributes[name]
      if (value !== undefined) {
        setAttribute(attributes, name, value)
      }
    }
  }

  // The server HTML does not otherwise carry a vnode's key or identity, so
  // hydration would adopt keyed children positionally. Stamp a digest of each so
  // hydration can verify it is adopting the same logical entity without the raw
  // key or source identity appearing in public markup; it strips the markers as
  // it adopts.
  if (context.emitHydrationMarkers) {
    if (node.key !== undefined) {
      const keyMarker = hydrationKeyMarker(node.key)
      if (keyMarker === undefined) {
        throw new Error(
          '[foldkit] Cannot server-render an element keyed by a symbol. A ' +
            'symbol key cannot be compared across the server and the client ' +
            '(a local symbol is a new value in every realm, so hydration ' +
            'could not tell two rows apart). Key hydratable elements by a ' +
            'string or a number.',
        )
      }
      setAttribute(attributes, HYDRATION_KEY_ATTRIBUTE, keyMarker)
    }
    if (node.identity !== undefined) {
      setAttribute(
        attributes,
        HYDRATION_IDENTITY_ATTRIBUTE,
        hydrationIdentityMarker(node.identity),
      )
    }
  }

  output.push(`<${tagName}`)
  serializeAttributes(output, attributes)
  output.push('>')

  // NOTE: void elements have no closing tag only in the HTML namespace. In
  // SVG or MathML foreign content the same names (`input`, `br`) are ordinary
  // elements, so omitting the closing tag would let a following sibling parse
  // as a child. Void handling, raw-text handling, and the form-control text
  // rules below are all gated on the element being in the HTML namespace;
  // foreign content always closes and serializes its children through
  // escaping.
  if (!isForeignNamespace && VOID_ELEMENTS.has(tagName)) {
    return
  }

  const childSelectValue = isForeignNamespace
    ? undefined
    : selectValueForChildren(tagName, node, selectValue)

  const isHtmlRawText = !isForeignNamespace && RAW_TEXT_ELEMENTS.has(tagName)

  const innerHtml = data?.props?.['innerHTML']
  if (typeof innerHtml === 'string' && hasTrustedInnerHtml(data?.props)) {
    if (isHtmlRawText) {
      assertRawTextIsSafe(tagName, innerHtml)
    }
    output.push(innerHtml)
  } else if (!isForeignNamespace && tagName === 'textarea') {
    const content = controlledValueContent(data?.props)
    if (content !== undefined) {
      if (content.startsWith('\n')) {
        output.push('\n')
      }
      output.push(escapeText(content))
    } else {
      if (leadingTextOf(node)?.startsWith('\n')) {
        output.push('\n')
      }
      serializeChildren(output, context, node, depth, childSelectValue)
    }
  } else if (!isForeignNamespace && tagName === 'output') {
    // A controlled <output> reflects its value prop as text content the same
    // way a textarea does, but as ordinary PCDATA with no leading-newline
    // handling. An uncontrolled output serializes its children.
    const content = controlledValueContent(data?.props)
    if (content !== undefined) {
      output.push(escapeText(content))
    } else {
      serializeChildren(output, context, node, depth, childSelectValue)
    }
  } else if (!isForeignNamespace && NEWLINE_DROPPING_ELEMENTS.has(tagName)) {
    if (leadingTextOf(node)?.startsWith('\n')) {
      output.push('\n')
    }
    serializeChildren(output, context, node, depth, childSelectValue)
  } else if (isHtmlRawText) {
    const rawText = collectRawText(node)
    assertRawTextIsSafe(tagName, rawText)
    if (tagName === 'noscript') {
      assertNoscriptTextIsSafe(rawText)
    }
    output.push(rawText)
  } else {
    serializeChildren(output, context, node, depth, childSelectValue)
  }

  output.push(`</${tagName}>`)
}

const serializeNode = (
  output: Array<string>,
  context: SerializeContext,
  node: VNode | string | null,
  depth: number,
  extraAttributes?: Readonly<Record<string, string>>,
  selectValue?: SelectSelection,
): void => {
  if (depth > MAX_RENDER_DEPTH) {
    throw new Error(
      `[foldkit] renderToString exceeded the maximum render depth of ${MAX_RENDER_DEPTH}. ` +
        'A view nesting elements this deeply, often from mapping untrusted ' +
        'hierarchical data straight to markup, is refused to protect the ' +
        'render stack.',
    )
  }
  if (node === null) {
    return
  }
  if (typeof node === 'string') {
    output.push(escapeText(node))
    return
  }
  const selector = node.sel
  if (selector === undefined || selector === '') {
    if (node.text !== undefined) {
      output.push(escapeText(node.text))
    }
    return
  }
  if (selector === '!') {
    const commentText = node.text ?? ''
    assertCommentTextIsSafe(commentText)
    output.push(`<!--${commentText}-->`)
    return
  }
  serializeElement(
    output,
    context,
    node,
    selector,
    depth,
    extraAttributes,
    selectValue,
  )
}

/** Serializes a view-produced vnode tree to an HTML string. Event handlers and
 *  hooks are behavior, not markup, and are skipped; attrs, class, dataset,
 *  prop-backed attributes, and inline style are emitted in that order. A `null`
 *  tree serializes to an empty comment, mirroring how the runtime patches
 *  `null` as a comment node.
 *
 * A hydratable render also stamps a digest of each vnode's key and identity, so
 * hydration can tell one logical entity from another; the raw key and the
 * compiler's source identity never appear in the markup. A render that is not
 * hydratable emits neither.
 *
 * @internal Not part of the `foldkit/experimental/server` surface; `renderToString` is the public entry to serialization.
 */
export const serializeHtml = (
  root: VNode | null,
  options?: SerializeOptions,
): string => {
  if (root === null) {
    return '<!---->'
  }
  const context: SerializeContext = {
    emitHydrationMarkers: options?.emitHydrationMarkers ?? false,
  }
  const output: Array<string> = []
  serializeNode(output, context, root, 0, options?.rootAttributes)
  return output.join('')
}
