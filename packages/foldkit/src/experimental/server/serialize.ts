import { Array as Array_ } from 'effect'

import type { VNode } from '../../snabbdom/vnode.js'
import { tagNameFromSelector } from '../../tagName.js'

/** Extra attributes appended to the serialized root element, used by
 *  `renderToString` to stamp the hydration marker without threading
 *  server-only concerns through view code. Root attributes are applied after
 *  the vnode's own data, so the stamp always wins over a same-named
 *  attribute in the view.
 *
 * @internal Not part of the `foldkit/experimental/server` surface; `renderToString` is the public entry to serialization.
 */
export type SerializeOptions = Readonly<{
  rootAttributes?: Readonly<Record<string, string>>
}>

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

const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set(['script', 'style'])

// NOTE: raw-text elements (`script`, `style`) parse their content as text
// until the first `</tagname`, so HTML entities do not work inside them and a
// closing-tag sequence in the content ends the element early. That is an
// injection vector on the server (a `</style>` in CSS text breaks out into
// live markup) that never surfaces client-side, where the content is a DOM
// text node. There is no valid escaping, so a closing-tag sequence is a hard
// error, matching how other renderers refuse it.
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
}

/** Escapes a string for use as HTML text content.
 *
 * @internal Shared with the template injector; not part of the `foldkit/experimental/server` surface.
 */
export const escapeText = (value: string): string =>
  value.replace(/[&<>\r]/g, character => TEXT_ESCAPES[character] ?? character)

/** Escapes a string for use inside a double-quoted HTML attribute value.
 *
 * @internal Shared with the template injector; not part of the `foldkit/experimental/server` surface.
 */
export const escapeAttributeValue = (value: string): string =>
  value.replace(
    /[&"<]/g,
    character => ATTRIBUTE_ESCAPES[character] ?? character,
  )

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
): void => {
  for (const name of Object.keys(properties)) {
    const value = properties[name]
    if (value === undefined || name === 'innerHTML') {
      continue
    }
    // NOTE: `value` on textarea/select is not a serializable attribute (textarea
    // uses its text content, select reflects the selected option), and on an
    // input an empty value matches the element's default so the attribute is
    // redundant. It stays meaningful elsewhere, e.g. `<option value="">`.
    if (
      name === 'value' &&
      (tagName === 'textarea' ||
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

const textareaContent = (
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

const leadingTextOf = (node: VNode): string | undefined => {
  if (node.text !== undefined) {
    return node.text
  }
  const [firstChild] = node.children ?? []
  if (typeof firstChild === 'string') {
    return firstChild
  }
  return firstChild?.text
}

const serializeChildren = (
  output: Array<string>,
  node: VNode,
  selectValue?: string,
): void => {
  const children = node.children
  if (children !== undefined) {
    for (const child of children) {
      serializeNode(output, child, undefined, selectValue)
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
  inherited: string | undefined,
): string | undefined => {
  if (tagName !== 'select') {
    return inherited
  }
  const value = node.data?.props?.['value']
  if (typeof value === 'string') {
    return value
  }
  return undefined
}

const serializeElement = (
  output: Array<string>,
  node: VNode,
  selector: string,
  extraAttributes?: Readonly<Record<string, string>>,
  selectValue?: string,
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
  const attributes = new Map<string, string>()

  if (data !== undefined) {
    collectDataAttributes(attributes, data)
    const properties = data.props
    if (properties !== undefined) {
      collectPropertyAttributes(attributes, tagName, properties)
    }
    const style = data.style
    if (style !== undefined) {
      collectStyleAttribute(attributes, style)
    }
  }

  if (
    tagName === 'option' &&
    selectValue !== undefined &&
    optionValue(node) === selectValue
  ) {
    setAttribute(attributes, 'selected', '')
  }

  if (extraAttributes !== undefined) {
    for (const name of Object.keys(extraAttributes)) {
      const value = extraAttributes[name]
      if (value !== undefined) {
        setAttribute(attributes, name, value)
      }
    }
  }

  output.push(`<${tagName}`)
  serializeAttributes(output, attributes)
  output.push('>')

  if (VOID_ELEMENTS.has(tagName)) {
    return
  }

  const childSelectValue = selectValueForChildren(tagName, node, selectValue)

  // NOTE: `script` and `style` are HTML raw-text elements only in the HTML
  // namespace. In SVG or MathML foreign content the parser reads their
  // children as ordinary markup, so emitting text verbatim there lets a
  // string like `<img onerror=...>` parse into a live element. Raw-text
  // handling is therefore gated on the element being in the HTML namespace;
  // foreign-content children fall through to escaped serialization.
  const isForeignNamespace = data?.ns !== undefined
  const isHtmlRawText = !isForeignNamespace && RAW_TEXT_ELEMENTS.has(tagName)

  const innerHtml = data?.props?.['innerHTML']
  if (typeof innerHtml === 'string') {
    if (isHtmlRawText) {
      assertRawTextIsSafe(tagName, innerHtml)
    }
    output.push(innerHtml)
  } else if (tagName === 'textarea') {
    const content = textareaContent(data?.props)
    if (content !== undefined) {
      if (content.startsWith('\n')) {
        output.push('\n')
      }
      output.push(escapeText(content))
    } else {
      if (leadingTextOf(node)?.startsWith('\n')) {
        output.push('\n')
      }
      serializeChildren(output, node, childSelectValue)
    }
  } else if (NEWLINE_DROPPING_ELEMENTS.has(tagName)) {
    if (leadingTextOf(node)?.startsWith('\n')) {
      output.push('\n')
    }
    serializeChildren(output, node, childSelectValue)
  } else if (isHtmlRawText) {
    const rawText = collectRawText(node)
    assertRawTextIsSafe(tagName, rawText)
    output.push(rawText)
  } else {
    serializeChildren(output, node, childSelectValue)
  }

  output.push(`</${tagName}>`)
}

const serializeNode = (
  output: Array<string>,
  node: VNode | string | null,
  extraAttributes?: Readonly<Record<string, string>>,
  selectValue?: string,
): void => {
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
  serializeElement(output, node, selector, extraAttributes, selectValue)
}

/** Serializes a view-produced vnode tree to an HTML string. Event handlers,
 *  hooks, keys, and identity are behavior, not markup, and are skipped;
 *  attrs, class, dataset, prop-backed attributes, and inline style are
 *  emitted in that order. A `null` tree serializes to an empty comment,
 *  mirroring how the runtime patches `null` as a comment node.
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
  const output: Array<string> = []
  serializeNode(output, root, options?.rootAttributes)
  return output.join('')
}
