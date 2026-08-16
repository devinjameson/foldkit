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

const classTokenSet = (value: string): Set<string> =>
  new Set(value.split(/\s+/).filter(token => token !== ''))

const declaredClassTokens = (vnode: VNode): Set<string> => {
  const moduleClass = vnode.data?.class
  if (moduleClass !== undefined) {
    return new Set(
      Object.keys(moduleClass).filter(name => moduleClass[name] === true),
    )
  }
  const attrClass = vnode.data?.attrs?.['class']
  return typeof attrClass === 'string' ? classTokenSet(attrClass) : new Set()
}

const setsEqual = (left: Set<string>, right: Set<string>): boolean => {
  if (left.size !== right.size) {
    return false
  }
  for (const value of left) {
    if (!right.has(value)) {
      return false
    }
  }
  return true
}

// NOTE: attribute-only divergence has no structural signal, so hydration
// compares the adopted DOM against what the client vnode declares. Class and
// the client's own raw attributes are compared. Reflected props (href, value)
// are not in `attrs`, and inline style is subject to browser CSS
// normalization, so neither is used as a mismatch signal here to avoid
// false positives. Only whether the values agree is used, never the values.
const hasAttributeMismatch = (element: Element, vnode: VNode): boolean => {
  const actualClasses = new Set(Array.from(element.classList))
  if (!setsEqual(declaredClassTokens(vnode), actualClasses)) {
    return true
  }

  const declaredAttrs = vnode.data?.attrs
  if (declaredAttrs !== undefined) {
    for (const name of Object.keys(declaredAttrs)) {
      if (name === 'class' || name === 'style') {
        continue
      }
      const declared = declaredAttrs[name]
      if (typeof declared === 'boolean') {
        if (declared !== element.hasAttribute(name)) {
          return true
        }
      } else if (declared === undefined) {
        if (element.hasAttribute(name)) {
          return true
        }
      } else if (element.getAttribute(name) !== String(declared)) {
        return true
      }
    }
  }

  return false
}

// NOTE: reconcile stale server DOM against the client's first render by
// seeding the adopted clone with the element's current attributes, classes,
// and inline styles. Server DOM state is all view-produced, so the diff
// modules remove any value the client tree does not reassert, converging a
// nondeterministic render instead of leaving stale, behavior-affecting state
// (a stale href, a stale class) on the page. Each piece of state is seeded
// into the channel the client vnode owns it through: class and inline style
// go to their modules only when the client uses those modules, and otherwise
// ride in attrs (alongside the reflected form attributes value, checked, and
// selected), so no value is written by one module and then removed as stale
// state by another. The hydration stamp is never seeded, so it is never
// removed.
const seedAdoptedState = (
  element: Element,
  vnode: VNode,
  clone: VNode,
  status: HydrationStatus,
): void => {
  const usesClassModule = vnode.data?.class !== undefined
  const usesStyleModule = vnode.data?.style !== undefined

  const attrs: Record<string, string> = {}
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name
    if (name === HYDRATION_STAMP_ATTRIBUTE) {
      continue
    }
    if (name === 'class' && usesClassModule) {
      continue
    }
    if (name === 'style' && usesStyleModule) {
      continue
    }
    attrs[name] = attribute.value
  }

  const classes = usesClassModule ? classListOf(element) : {}
  const style = usesStyleModule ? inlineStyleOf(element) : {}

  clone.data = {
    ...clone.data,
    ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
    ...(Object.keys(classes).length > 0 ? { class: classes } : {}),
    ...(Object.keys(style).length > 0 ? { style } : {}),
  }

  if (hasAttributeMismatch(element, vnode)) {
    detectMismatch(status)
  }
}

type AdoptedElements = Set<Node>
type HydrationStatus = { isMismatchDetected: boolean }

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

  seedAdoptedState(element, vnode, clone, status)

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
  if (vnodeChildren === undefined) {
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
export const __hydrateVNode = (
  hydrationRoot: Element,
  nextVNode: VNode | null,
  seen?: Set<object>,
): VNode => {
  const dedupedVNode =
    nextVNode !== null ? dedupeSharedVNodes(nextVNode, seen) : h('!')
  const status: HydrationStatus = { isMismatchDetected: false }

  if (
    dedupedVNode.sel === undefined ||
    dedupedVNode.sel === '' ||
    dedupedVNode.sel === '!' ||
    !matchesTag(hydrationRoot, dedupedVNode.sel)
  ) {
    detectMismatch(status)
    const patchedVNode = patch(toVNode(hydrationRoot), dedupedVNode)
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
  fireAdoptedInsertHooks(patchedVNode, adopted)
  reportMismatch(status)
  return patchedVNode
}
