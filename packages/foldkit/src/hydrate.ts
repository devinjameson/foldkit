import { Option } from 'effect'

import type { VNode } from './snabbdom/index.js'
import { h, toVNode } from './snabbdom/index.js'
import { tagNameFromSelector } from './tagName.js'
import { dedupeSharedVNodes, patch } from './vdom.js'

// NOTE: the differ only knows the page through the `elm` pointers on its
// vnodes; `patch` never queries the document. On a server-rendered page the
// browser has already built real DOM by parsing the HTML the server sent
// (the "server DOM" below), but snabbdom did not create those nodes, so no
// vnode anywhere points at them and the differ cannot see them. Hydration's
// whole job is to make that DOM visible to the differ, then let one
// ordinary patch attach behavior to it.
//
// The mechanism has three steps. First, walk the first render's vnode tree
// and the server DOM together, position by position. Second, wherever the
// two agree, record the existing DOM node: those records form a second
// vnode tree, a clone of the first render's tree whose `elm` fields point
// at the server DOM nodes. The clone copies exactly what `sameVnode`
// compares (`sel`, `key`, `identity`, `data.is`), so `patchVnode` reuses
// every adopted element, and deliberately nothing else, so every module
// update hook re-asserts the new tree's attrs, props, classes, styles, and
// listeners onto the adopted elements. Third, run `patch(clone, newTree)`:
// to the differ this is a completely ordinary update from a tree that
// happens to point at existing nodes, so the vendored differ stays
// untouched and never learns the nodes came from a server.
//
// Where the DOM disagrees with the vnode tree, the walk clears the nearest
// parent's children and hands `patch` an empty child list, so the subtree is
// rebuilt through `createElm`, which is exactly the pre-hydration replace
// behavior scoped to the mismatching subtree. Trailing vnode children with
// no DOM counterpart are simply absent from the clone; `updateChildren`
// appends them.

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
const HYDRATION_STAMP_ATTRIBUTE = 'data-foldkit-app'

// The style module keys regular properties in camelCase (`backgroundColor`)
// and custom properties as written (`--accent`), so a property read from the
// DOM in kebab case is converted to the module's key form before seeding.
const styleModuleKey = (property: string): string =>
  property.startsWith('--')
    ? property
    : property.replace(/-([a-z])/g, (_match, character: string) =>
        character.toUpperCase(),
      )

const classListOf = (element: Element): Record<string, boolean> => {
  const classes: Record<string, boolean> = {}
  for (const className of Array.from(element.classList)) {
    classes[className] = true
  }
  return classes
}

const inlineStyleOf = (element: Element): Record<string, string> => {
  const style: Record<string, string> = {}
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    const inlineStyle = element.style
    for (let index = 0; index < inlineStyle.length; index += 1) {
      const property = inlineStyle.item(index)
      style[styleModuleKey(property)] = inlineStyle.getPropertyValue(property)
    }
  }
  return style
}

// NOTE: for a custom element, seed only the class tokens the vnode declares so
// the class module leaves component-added tokens in place; the view does not
// reassert them, so the full class list would reconcile them away as stale.
// Reading each token from the element keeps an agreeing render a no-op. A normal
// element seeds its whole class list, so stale tokens reconcile away.
const seedClasses = (
  element: Element,
  vnode: VNode,
  classOwnedByModule: boolean,
  isCustomElement: boolean,
): Record<string, boolean> => {
  if (!classOwnedByModule) {
    return {}
  }
  if (!isCustomElement) {
    return classListOf(element)
  }
  const declared: Record<string, boolean> = {}
  for (const token of Object.keys(vnode.data?.class ?? {})) {
    declared[token] = element.classList.contains(token)
  }
  return declared
}

// NOTE: the style counterpart to seedClasses. For a custom element, seed only
// the style properties the vnode declares so the style module leaves
// component-added properties in place; a normal element seeds its whole inline
// style so stale properties reconcile away.
const seedStyle = (
  element: Element,
  vnode: VNode,
  styleOwnedByModule: boolean,
  isCustomElement: boolean,
): Record<string, string> => {
  if (!styleOwnedByModule) {
    return {}
  }
  if (!isCustomElement) {
    return inlineStyleOf(element)
  }
  const current = inlineStyleOf(element)
  const declared: Record<string, string> = {}
  for (const [key, value] of Object.entries(vnode.data?.style ?? {})) {
    if (typeof value === 'string') {
      declared[key] = current[key] ?? ''
    }
  }
  return declared
}

// Properties the serializer emits as attributes but the client sets as DOM
// properties that do not reflect back to the attribute, so a correct hydration
// drops the server attribute. When a vnode owns one of these through
// `data.props`, the signature compares the live property value instead of the
// attribute, so that expected drop is not read as a disagreement. A view that
// instead sets the same name as a raw attribute keeps it in the attribute set.
const NON_REFLECTING_PROPERTIES: ReadonlySet<string> = new Set([
  'value',
  'checked',
  'selected',
  'muted',
])

const propertyManagedNames = (vnode: VNode): ReadonlyArray<string> => {
  const props = vnode.data?.props
  if (props === undefined) {
    return []
  }
  return Array.from(NON_REFLECTING_PROPERTIES).filter(name => name in props)
}

const byName = (
  [leftName]: readonly [string, string],
  [rightName]: readonly [string, string],
): number => leftName.localeCompare(rightName)

// A structured, order-independent snapshot of the state an element and its
// vnode share: the DOM attributes, the non-reflecting properties the vnode
// owns (read from the element, not the attribute), the class set, and inline
// style. Comparing the snapshot taken during adoption (the server DOM) with
// the element's state after the client patch flags any attribute, property,
// class, or style the two disagree on. Both sides pass through the same DOM
// APIs, so spelling differences never register, and the snapshot is JSON so no
// value can collide with a delimiter. Values feed the comparison, never a log.
export const __elementSignature = (element: Element, vnode: VNode): string => {
  const propertyNames = propertyManagedNames(vnode)

  const attributes: Array<[string, string]> = []
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name
    if (
      name === HYDRATION_STAMP_ATTRIBUTE ||
      name === 'class' ||
      name === 'style' ||
      propertyNames.includes(name)
    ) {
      continue
    }
    attributes.push([name, attribute.value])
  }
  attributes.sort(byName)

  const properties: Array<[string, string]> = []
  for (const name of propertyNames) {
    properties.push([name, String(Reflect.get(element, name))])
  }
  properties.sort(byName)

  const styles = Object.entries(inlineStyleOf(element)).sort(byName)

  const classes = Array.from(element.classList).sort()

  return JSON.stringify({ attributes, properties, classes, styles })
}

// NOTE: reconcile stale server DOM against the client's first render by
// seeding the adopted clone with the element's current attributes, classes,
// and inline styles. Server DOM state is all view-produced, so the diff
// modules remove any value the client tree does not reassert, converging a
// nondeterministic render instead of leaving stale, behavior-affecting state
// (a stale href, a stale class) on the page. class and inline style are
// seeded into their own module only when the client view owns them solely
// through that module. When the view also sets `class` or `style` through a
// raw attribute, or does not use the module at all, the whole attribute rides
// in attrs and the module (if present) re-asserts its tokens on top, so no
// value is written by one module and then removed as stale state by another.
// The hydration stamp is never seeded, so it is never removed.
const seedAdoptedState = (
  element: Element,
  vnode: VNode,
  clone: VNode,
  status: HydrationStatus,
  isCustomElement: boolean,
): void => {
  const classOwnedByModule =
    vnode.data?.class !== undefined &&
    vnode.data?.attrs?.['class'] === undefined
  const styleOwnedByModule =
    vnode.data?.style !== undefined &&
    vnode.data?.attrs?.['style'] === undefined

  // NOTE: a custom element that upgraded before hydration adds attributes of its
  // own in connectedCallback. Seeding only the attributes the vnode declares
  // leaves those component-owned attributes in place, while a vnode-declared
  // attribute still reconciles.
  const declaredAttributes = isCustomElement
    ? new Set(
        Object.keys(vnode.data?.attrs ?? {}).map(name => name.toLowerCase()),
      )
    : undefined

  const attrs: Record<string, string> = {}
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name
    if (name === HYDRATION_STAMP_ATTRIBUTE) {
      continue
    }
    if (name === 'class' && classOwnedByModule) {
      continue
    }
    if (name === 'style' && styleOwnedByModule) {
      continue
    }
    if (
      declaredAttributes !== undefined &&
      !declaredAttributes.has(name.toLowerCase())
    ) {
      continue
    }
    attrs[name] = attribute.value
  }

  const classes = seedClasses(
    element,
    vnode,
    classOwnedByModule,
    isCustomElement,
  )
  const style = seedStyle(element, vnode, styleOwnedByModule, isCustomElement)

  clone.data = {
    ...clone.data,
    ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
    ...(Object.keys(classes).length > 0 ? { class: classes } : {}),
    ...(Object.keys(style).length > 0 ? { style } : {}),
  }

  // In development, record the server DOM signature so the post-patch pass can
  // report an attribute-only mismatch the structural walk cannot see. Gated on
  // the dev flag so a production hydrate does no extra work.
  if (import.meta.hot) {
    status.adoptedSignatures.set(element, {
      vnode,
      server: __elementSignature(element, vnode),
    })
  }
}

type AdoptedElements = Set<Node>
type AdoptedSignature = Readonly<{ vnode: VNode; server: string }>
type HydrationStatus = {
  isMismatchDetected: boolean
  adoptedSignatures: Map<Element, AdoptedSignature>
}

const detectMismatch = (status: HydrationStatus): void => {
  status.isMismatchDetected = true
}

const reportMismatch = (status: HydrationStatus): void => {
  if (import.meta.hot && status.isMismatchDetected) {
    console.warn(
      '[foldkit] The server DOM did not match the first client view during ' +
        'hydration. Foldkit reconciled the mismatching subtree. Ensure Flags, ' +
        'init, and view produce deterministic initial markup.',
    )
  }
}

const isText = (node: Node): node is Text => node.nodeType === Node.TEXT_NODE

const isComment = (node: Node): node is Comment =>
  node.nodeType === Node.COMMENT_NODE

const isElement = (node: Node): node is Element =>
  node.nodeType === Node.ELEMENT_NODE

const hasOnlyTextContent = (element: Element): boolean => {
  const firstChild = element.firstChild
  return (
    firstChild === null ||
    (firstChild.nextSibling === null && isText(firstChild))
  )
}

const matchesTag = (element: Element, selector: string): boolean =>
  element.tagName.toLowerCase() === tagNameFromSelector(selector).toLowerCase()

// The namespace a vnode expects is carried in `data.ns` for foreign content
// (SVG, MathML) and is otherwise HTML. An element whose namespace disagrees
// (an HTML element parsed inside an SVG integration point, say) must be
// rebuilt rather than adopted, since the two are not interchangeable.
const namespaceOf = (vnode: VNode): string =>
  typeof vnode.data?.ns === 'string' ? vnode.data.ns : HTML_NAMESPACE

const matchesNamespace = (element: Element, vnode: VNode): boolean =>
  (element.namespaceURI ?? HTML_NAMESPACE) === namespaceOf(vnode)

const cloneOf = (vnode: VNode, elm: Node): VNode => {
  const clone: VNode = {
    sel: vnode.sel,
    data: vnode.data?.is === undefined ? {} : { is: vnode.data.is },
    children: undefined,
    elm,
    text: undefined,
    key: vnode.key,
  }
  if (vnode.identity !== undefined) {
    clone.identity = vnode.identity
  }
  return clone
}

const asVNode = (child: VNode | string): VNode =>
  typeof child === 'string'
    ? {
        sel: undefined,
        data: undefined,
        children: undefined,
        elm: undefined,
        text: child,
        key: undefined,
      }
    : child

const clearChildren = (element: Element): void => {
  element.textContent = ''
}

type TextAdoption = Readonly<{ adoptedNode: Text; nextDomChild: Node | null }>

const adoptText = (
  element: Element,
  domChild: Node | null,
  text: string,
): Option.Option<TextAdoption> => {
  if (domChild !== null && isText(domChild)) {
    const domText = domChild.data
    if (domText === text) {
      return Option.some({
        adoptedNode: domChild,
        nextDomChild: domChild.nextSibling,
      })
    }
    if (domText.startsWith(text)) {
      domChild.splitText(text.length)
      return Option.some({
        adoptedNode: domChild,
        nextDomChild: domChild.nextSibling,
      })
    }
    return Option.none()
  }
  if (text === '') {
    const emptyTextNode = element.ownerDocument.createTextNode('')
    element.insertBefore(emptyTextNode, domChild)
    return Option.some({ adoptedNode: emptyTextNode, nextDomChild: domChild })
  }
  return Option.none()
}

const adoptElement = (
  element: Element,
  vnode: VNode,
  adopted: AdoptedElements,
  status: HydrationStatus,
): VNode => {
  const clone = cloneOf(vnode, element)
  adopted.add(element)

  // NOTE: an autonomous custom element (an HTML-namespace element whose name
  // carries a hyphen) that upgraded before hydration adds attributes, classes,
  // styles, and light DOM of its own in connectedCallback. The attributes, class
  // tokens, and style properties the vnode does not declare are always preserved
  // (here and in seedAdoptedState). Light DOM ownership follows the vnode: a
  // childless vnode leaves the component's light DOM untouched, while a vnode
  // that declares children owns the light DOM and reconciles it like any
  // element. The two cannot share: once both write same-tag nodes a positional
  // walk cannot tell a component node from a view node, so declared children
  // take full ownership rather than interleave. The test is the name shape, not
  // `customElements.get`: whether the element has upgraded is timing-dependent
  // at hydration (its definition may register after the server DOM parses), so a
  // name test is deterministic. A hyphenated element that never upgrades is
  // treated the same way, which is safe: with no component light DOM, a
  // childless vnode leaves an empty element and a vnode with children reconciles
  // normally.
  const isCustomElement =
    (element.namespaceURI === null ||
      element.namespaceURI === HTML_NAMESPACE) &&
    element.localName.includes('-')

  seedAdoptedState(element, vnode, clone, status, isCustomElement)

  // NOTE: a controlled textarea serializes its value as text content, which
  // sets the element's defaultValue. A fresh boot sets only the value
  // property and leaves defaultValue empty, so the server text is cleared
  // before the props module applies the value; otherwise the adopted
  // textarea's defaultValue and form.reset would differ from a fresh boot.
  // An uncontrolled textarea, whose content is its default, is left alone.
  if (
    element.tagName === 'TEXTAREA' &&
    vnode.data?.props?.['value'] !== undefined
  ) {
    clearChildren(element)
    clone.children = []
    return clone
  }

  const authoredInnerHtml = vnode.data?.props?.['innerHTML']
  if (authoredInnerHtml !== undefined) {
    // NOTE: the browser normalizes markup as it parses (entity forms, tag
    // case, attribute order), so the served innerHTML string rarely equals
    // the authored one byte for byte. Parsing the authored string through a
    // probe element of the same tag compares the two in normalized form;
    // when they agree the clone carries the authored string, the props
    // module sees no change, and the adopted subtree survives. The probe is
    // created in the element's own namespace: foreign content such as SVG
    // parses with case-preserved names (pathLength, viewBox) that an
    // HTML-context parse would lowercase, false-mismatching every camelCase
    // attribute.
    if (typeof authoredInnerHtml === 'string') {
      const probe =
        element.namespaceURI === null || element.namespaceURI === HTML_NAMESPACE
          ? element.ownerDocument.createElement(element.tagName)
          : element.ownerDocument.createElementNS(
              element.namespaceURI,
              element.tagName,
            )
      probe.innerHTML = authoredInnerHtml
      const isEquivalentMarkup = probe.innerHTML === element.innerHTML
      if (!isEquivalentMarkup) {
        detectMismatch(status)
      }
      clone.data = {
        ...clone.data,
        props: {
          innerHTML: isEquivalentMarkup ? authoredInnerHtml : element.innerHTML,
        },
      }
    } else {
      clone.data = { ...clone.data, props: { innerHTML: element.innerHTML } }
    }
    clone.children = []
    return clone
  }

  const vnodeChildren = vnode.children
  // NOTE: no children (undefined) and an empty child list both mean the view
  // declares no children, so they share the childless path. This is also where
  // a custom element's ownership splits: a childless vnode has no view child to
  // adopt, so the component's light DOM is left untouched, while a vnode with
  // real children (the branch below) owns the light DOM and reconciles it.
  if (vnodeChildren === undefined || vnodeChildren.length === 0) {
    // NOTE: only adopt the text shortcut when the element already holds a
    // single text node. `textContent` flattens across element children, so
    // copying it for an element that carries stray markup would compare equal
    // to the vnode text and leave that markup in place. Leaving `clone.text`
    // undefined makes `patchVnode` overwrite the element's content with the
    // vnode text instead, rebuilding the mismatching shape.
    if (vnode.text !== undefined) {
      if (hasOnlyTextContent(element)) {
        clone.text = element.textContent ?? ''
        if (clone.text !== vnode.text) {
          detectMismatch(status)
        }
      } else {
        detectMismatch(status)
      }
    } else if (!isCustomElement && element.firstChild !== null) {
      // NOTE: a childless vnode (no children or an empty child list, and no
      // text) owns an empty element. Server DOM left under it, an older build's
      // content behind a cache race, would otherwise survive every future
      // render, since patchVnode has nothing to diff it against. Clear it so the
      // empty client tree wins, matching the mismatch branches below. A custom
      // element is exempt: its light DOM is component-owned, not stale server
      // state.
      detectMismatch(status)
      clearChildren(element)
      clone.children = []
    }
    return clone
  }

  const cloneChildren: Array<VNode> = []
  let domChild: Node | null = element.firstChild

  for (const rawChild of vnodeChildren) {
    const child = asVNode(rawChild)

    if (child.sel === undefined || child.sel === '') {
      const childText = child.text ?? ''
      const maybeAdoption = adoptText(element, domChild, childText)
      if (Option.isNone(maybeAdoption)) {
        detectMismatch(status)
        if (domChild === null) {
          break
        }
        clearChildren(element)
        clone.children = []
        return clone
      }
      const adoption = maybeAdoption.value
      const textClone = cloneOf(child, adoption.adoptedNode)
      textClone.text = childText
      cloneChildren.push(textClone)
      domChild = adoption.nextDomChild
      continue
    }

    if (domChild === null) {
      detectMismatch(status)
      break
    }

    if (child.sel === '!') {
      if (!isComment(domChild)) {
        detectMismatch(status)
        clearChildren(element)
        clone.children = []
        return clone
      }
      const commentClone = cloneOf(child, domChild)
      commentClone.text = domChild.data
      cloneChildren.push(commentClone)
      domChild = domChild.nextSibling
      continue
    }

    if (
      !isElement(domChild) ||
      !matchesTag(domChild, child.sel) ||
      !matchesNamespace(domChild, child)
    ) {
      detectMismatch(status)
      clearChildren(element)
      clone.children = []
      return clone
    }
    cloneChildren.push(adoptElement(domChild, child, adopted, status))
    domChild = domChild.nextSibling
  }

  while (domChild !== null) {
    detectMismatch(status)
    const nextDomChild: Node | null = domChild.nextSibling
    element.removeChild(domChild)
    domChild = nextDomChild
  }

  clone.children = cloneChildren
  return clone
}

const fireAdoptedInsertHooks = (
  vnode: VNode,
  adopted: AdoptedElements,
): void => {
  const children = vnode.children
  if (children !== undefined) {
    for (const child of children) {
      if (typeof child !== 'string') {
        fireAdoptedInsertHooks(child, adopted)
      }
    }
  }
  const insertHook = vnode.data?.hook?.insert
  if (
    insertHook !== undefined &&
    vnode.elm !== undefined &&
    adopted.has(vnode.elm)
  ) {
    insertHook(vnode)
  }
}

/** Hydrates a server-rendered root element against the first render's vnode
 *  tree. Matching DOM nodes are adopted in place, so pre-rendered content is
 *  never torn down on boot: module hooks attach listeners and re-assert
 *  attrs and props onto the existing elements, and `insert` hooks (Mounts)
 *  fire for adopted nodes in the same children-first order the differ uses
 *  for created ones. A mismatching subtree falls back to a rebuild through
 *  `createElm` at the nearest parent, and a root-level mismatch falls back
 *  to the pre-hydration replace boot. Development builds warn when
 *  reconciliation is required. Returns the patched vnode to store as the
 *  runtime's current tree. */
// Replace the hydration root with a fresh render of the vnode. snabbdom's
// sameVnode compares tag but not namespace, so patching the root directly
// would reuse a same-tag element even across a namespace change. Patching
// against a comment placed where the root was is never sameVnode with a new
// element, so the differ builds a fresh node in the correct namespace and
// swaps it in.
const replaceHydrationRoot = (hydrationRoot: Element, vnode: VNode): VNode => {
  const parent = hydrationRoot.parentNode
  if (parent === null) {
    return patch(toVNode(hydrationRoot), vnode)
  }
  const placeholder = hydrationRoot.ownerDocument.createComment('')
  parent.replaceChild(placeholder, hydrationRoot)
  return patch(toVNode(placeholder), vnode)
}

export const __hydrateVNode = (
  hydrationRoot: Element,
  nextVNode: VNode | null,
  seen?: Set<object>,
): VNode => {
  const dedupedVNode =
    nextVNode !== null ? dedupeSharedVNodes(nextVNode, seen) : h('!')
  const status: HydrationStatus = {
    isMismatchDetected: false,
    adoptedSignatures: new Map(),
  }

  if (
    dedupedVNode.sel === undefined ||
    dedupedVNode.sel === '' ||
    dedupedVNode.sel === '!' ||
    !matchesTag(hydrationRoot, dedupedVNode.sel) ||
    !matchesNamespace(hydrationRoot, dedupedVNode)
  ) {
    detectMismatch(status)
    const patchedVNode = replaceHydrationRoot(hydrationRoot, dedupedVNode)
    reportMismatch(status)
    return patchedVNode
  }

  const adopted: AdoptedElements = new Set()
  const adoptedClone = adoptElement(
    hydrationRoot,
    dedupedVNode,
    adopted,
    status,
  )
  const patchedVNode = patch(adoptedClone, dedupedVNode)
  if (import.meta.hot && !status.isMismatchDetected) {
    for (const [element, { vnode, server }] of status.adoptedSignatures) {
      if (__elementSignature(element, vnode) !== server) {
        detectMismatch(status)
        break
      }
    }
  }
  fireAdoptedInsertHooks(patchedVNode, adopted)
  reportMismatch(status)
  return patchedVNode
}
