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

// Properties the serializer reflects as attributes for correct pre-hydration
// markup, paired with the attribute name it writes. Each is removed from the
// adopted element so the client's property-driven state, not the served
// attribute, is the element's default.
const REFLECTED_PROPERTY_ATTRIBUTES: ReadonlyArray<readonly [string, string]> =
  [
    ['value', 'value'],
    ['checked', 'checked'],
    ['muted', 'muted'],
  ]

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

  // NOTE: the serializer reflects some properties as attributes so the served
  // page is correct before hydration: `selected` on the chosen option, and
  // `value`/`checked`/`muted` on form controls. The client drives these
  // through DOM properties, and its vnodes carry no such attribute, so a
  // fresh client boot never sets the attribute. Recording the stamped
  // attribute in the clone lets the attributes module remove it during the
  // adopting patch, so the adopted element's `defaultValue`, `defaultChecked`,
  // and reset behavior match a fresh boot rather than the served markup.
  const stampedAttributes: Record<string, string> = {}
  if (element.tagName === 'OPTION' && element.hasAttribute('selected')) {
    stampedAttributes['selected'] = ''
  }
  for (const [property, attribute] of REFLECTED_PROPERTY_ATTRIBUTES) {
    if (
      vnode.data?.props?.[property] !== undefined &&
      element.hasAttribute(attribute)
    ) {
      stampedAttributes[attribute] = ''
    }
  }
  if (Object.keys(stampedAttributes).length > 0) {
    clone.data = { ...clone.data, attrs: stampedAttributes }
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

    if (!isElement(domChild) || !matchesTag(domChild, child.sel)) {
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
