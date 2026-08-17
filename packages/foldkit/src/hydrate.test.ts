import { Array as Array_, Context, Option } from 'effect'
import { afterEach, beforeEach, expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import { serializeHtml } from './experimental/server/serialize.js'
import {
  type BoundaryRegistry,
  beginRender,
  createBoundaryRegistry,
} from './html/boundary.js'
import { __htmlBuilder } from './html/index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from './html/runtimeSingleton.js'
import { __elementSignature, __hydrateVNode } from './hydrate.js'
import { type VNode, h as snabbdomH, toVNode } from './snabbdom/index.js'
import { patch } from './vdom.js'

type Message = Readonly<{ _tag: 'ClickedButton' }>

const ClickedButton = (): Message => ({ _tag: 'ClickedButton' })

const h = __htmlBuilder<Message>()

describe('__hydrateVNode', () => {
  let registry: BoundaryRegistry
  let dispatched: Array<unknown>
  let host: HTMLDivElement

  const buildView = <A>(build: () => A): A => {
    registry = createBoundaryRegistry()
    const dispatchSync: DispatchSync = message => {
      dispatched.push(message)
    }
    setRuntime(dispatchSync, Context.empty(), registry)
    beginRender(registry)
    try {
      return build()
    } finally {
      clearRuntime()
    }
  }

  // The server renders every page the client hydrates with the hydration
  // markers on, so the tests serialize the same way rather than through the
  // marker-free static form.
  const serializeHydratable = (root: VNode | null): string =>
    serializeHtml(root, { emitHydrationMarkers: true })

  const mountServerHtml = (markup: string): Element => {
    host.innerHTML = markup
    const root = host.firstElementChild
    if (root === null) {
      throw new Error('server markup did not produce a root element')
    }
    return root
  }

  beforeEach(() => {
    dispatched = []
    host = document.createElement('div')
    document.body.appendChild(host)
  })

  afterEach(() => {
    host.remove()
  })

  it('adopts server-rendered elements in place', () => {
    const view = buildView(() =>
      h.div([h.Class('page')], [h.span([h.Id('greeting')], ['hello'])]),
    )
    const root = mountServerHtml(serializeHydratable(view))
    const span = root.firstElementChild

    const patchedVNode = buildView(() =>
      __hydrateVNode(
        root,
        h.div([h.Class('page')], [h.span([h.Id('greeting')], ['hello'])]),
      ),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.firstElementChild).toBe(span)
    expect(root.className).toBe('page')
    expect(span?.textContent).toBe('hello')
  })

  it('attaches event listeners to adopted elements', () => {
    const view = buildView(() =>
      h.button([h.Id('go'), h.OnClick(ClickedButton())], ['Go']),
    )
    const root = mountServerHtml(serializeHydratable(view))

    buildView(() =>
      __hydrateVNode(
        root,
        h.button([h.Id('go'), h.OnClick(ClickedButton())], ['Go']),
      ),
    )

    root.dispatchEvent(new MouseEvent('click'))
    expect(dispatched).toEqual([ClickedButton()])
  })

  it('hydrates a table with an explicit tbody and an interactive cell', () => {
    const view = () =>
      h.table(
        [],
        [
          h.tbody(
            [],
            [
              h.tr(
                [],
                [h.td([], [h.button([h.OnClick(ClickedButton())], ['Go'])])],
              ),
            ],
          ),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const button = root.querySelector('button')

    buildView(() => __hydrateVNode(root, view()))

    expect(root.querySelector('button')).toBe(button)
    button?.dispatchEvent(new MouseEvent('click'))
    expect(dispatched).toEqual([ClickedButton()])
  })

  it('splits merged text nodes for adjacent text children', () => {
    const view = buildView(() => h.p([], ['count: ', '42']))
    const root = mountServerHtml(serializeHydratable(view))
    expect(root.childNodes.length).toBe(1)

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.p([], ['count: ', '42'])),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.childNodes.length).toBe(2)
    expect(root.textContent).toBe('count: 42')
  })

  it('rebuilds a mismatching subtree at the nearest parent', () => {
    const root = mountServerHtml(
      '<div class="page"><section><em>stale</em></section></div>',
    )
    const section = root.firstElementChild

    const patchedVNode = buildView(() =>
      __hydrateVNode(
        root,
        h.div([h.Class('page')], [h.section([], [h.strong([], ['fresh'])])]),
      ),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.firstElementChild).toBe(section)
    expect(section?.innerHTML).toBe('<strong>fresh</strong>')
  })

  it('removes extra server nodes beyond the vnode children', () => {
    const root = mountServerHtml(
      '<ul><li>one</li><li>two</li><li>stale</li></ul>',
    )

    buildView(() =>
      __hydrateVNode(root, h.ul([], [h.li([], ['one']), h.li([], ['two'])])),
    )

    expect(root.children.length).toBe(2)
    expect(root.textContent).toBe('onetwo')
  })

  it('appends trailing vnode children missing from the server DOM', () => {
    const root = mountServerHtml('<ul><li>one</li></ul>')
    const first = root.firstElementChild

    buildView(() =>
      __hydrateVNode(root, h.ul([], [h.li([], ['one']), h.li([], ['two'])])),
    )

    expect(root.children.length).toBe(2)
    expect(root.firstElementChild).toBe(first)
    expect(root.lastElementChild?.textContent).toBe('two')
  })

  it('rebuilds keyed rows instead of transferring state to the wrong entity', () => {
    // Server rendered rows A then B; the client's first view is B then A (stale
    // or reordered HTML). Positional adoption would hand client row B the server
    // node still holding A's typed value. The key markers must force a rebuild.
    const serverView = () =>
      h.div(
        [],
        [
          h.keyed('input')('A', [h.Type('text'), h.DataAttribute('row', 'A')]),
          h.keyed('input')('B', [h.Type('text'), h.DataAttribute('row', 'B')]),
        ],
      )
    const root = mountServerHtml(serializeHydratable(buildView(serverView)))
    const [serverNodeA, serverNodeB] = Array.from(
      root.querySelectorAll('input'),
    )
    if (
      !(serverNodeA instanceof HTMLInputElement) ||
      !(serverNodeB instanceof HTMLInputElement)
    ) {
      throw new Error('expected two server input rows')
    }
    serverNodeA.value = 'typed-into-A'
    serverNodeB.value = 'typed-into-B'

    const clientView = () =>
      h.div(
        [],
        [
          h.keyed('input')('B', [h.Type('text'), h.DataAttribute('row', 'B')]),
          h.keyed('input')('A', [h.Type('text'), h.DataAttribute('row', 'A')]),
        ],
      )
    buildView(() => __hydrateVNode(root, clientView()))

    const firstInput = root.querySelector('input')
    expect(firstInput?.getAttribute('data-row')).toBe('B')
    expect(firstInput).not.toBe(serverNodeA)
    if (firstInput instanceof HTMLInputElement) {
      expect(firstInput.value).not.toBe('typed-into-A')
    }
    expect(root.querySelector('[data-foldkit-key]')).toBeNull()
  })

  it('rebuilds a row keyed by a number when the client keys it by the same digits as a string', () => {
    // The runtime compares keys with `===`, so the number 1 and the string '1'
    // are different entities. A marker that collapsed the two would hand the
    // string-keyed client row the number-keyed server node, and the value typed
    // into it.
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() => h.div([], [h.keyed('input')(1, [h.Type('text')])])),
      ),
    )
    const serverInput = root.querySelector('input')
    if (!(serverInput instanceof HTMLInputElement)) {
      throw new Error('expected a server input row')
    }
    serverInput.value = 'typed-into-1'

    buildView(() =>
      __hydrateVNode(
        root,
        h.div([], [h.keyed('input')('1', [h.Type('text')])]),
      ),
    )

    const hydratedInput = root.querySelector('input')
    expect(hydratedInput).not.toBe(serverInput)
    if (hydratedInput instanceof HTMLInputElement) {
      expect(hydratedInput.value).not.toBe('typed-into-1')
    }
  })

  it('refuses a page from another build before it can move any DOM state', () => {
    // Reproduction A: the view module is byte-identical across the two builds
    // and only a constant it imports changed, so every view identity matches
    // and no per-element comparison can see the difference. The build token is
    // what separates the two deployments.
    const serverRoot = buildView(() =>
      h.form([], [h.input([h.Type('text'), h.Name('email')])]),
    )
    if (serverRoot === null) {
      throw new Error('expected a server root')
    }
    const identity = 'src/page/account.ts#field@1111aaaa2222'
    const [serverField] = (serverRoot.children ?? []).filter(
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (serverField === undefined) {
      throw new Error('expected a server field')
    }
    serverField.identity = identity

    const root = mountServerHtml(serializeHydratable(serverRoot))
    // The served page came from a build that stamped its own token.
    root.setAttribute('data-foldkit-build', 'build-one')
    const servedInput = root.querySelector('input')
    if (!(servedInput instanceof HTMLInputElement)) {
      throw new Error('expected a served input')
    }
    servedInput.value = 'alice@example.com'

    const clientRoot = buildView(() =>
      h.form([], [h.input([h.Type('text'), h.Name('ssn')])]),
    )
    if (clientRoot === null) {
      throw new Error('expected a client root')
    }
    const [clientField] = (clientRoot.children ?? []).filter(
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (clientField === undefined) {
      throw new Error('expected a client field')
    }
    // The same identity on both sides: only the imported constant changed.
    clientField.identity = identity

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, clientRoot, undefined, 'build-two'),
    )

    expect(patchedVNode.elm).not.toBe(root)
    const hydratedInput =
      patchedVNode.elm instanceof Element
        ? patchedVNode.elm.querySelector('input')
        : null
    expect(hydratedInput).not.toBe(servedInput)
    if (hydratedInput instanceof HTMLInputElement) {
      expect(hydratedInput.getAttribute('name')).toBe('ssn')
      expect(hydratedInput.value).not.toBe('alice@example.com')
    }
  })

  it('refuses a page whose build id is absent from a client that has one', () => {
    // Reproduction B: the parent's call changed while the component it calls
    // did not, so the winning identity is the component's and matches on both
    // sides. A page built without the plugin meeting a client built with it is
    // the same disagreement seen from the other direction.
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() =>
          h.form([], [h.input([h.Type('text'), h.Name('email')])]),
        ),
      ),
    )
    const servedInput = root.querySelector('input')
    if (!(servedInput instanceof HTMLInputElement)) {
      throw new Error('expected a served input')
    }
    servedInput.value = 'alice@example.com'

    const patchedVNode = buildView(() =>
      __hydrateVNode(
        root,
        h.form([], [h.input([h.Type('text'), h.Name('ssn')])]),
        undefined,
        'build-two',
      ),
    )

    expect(patchedVNode.elm).not.toBe(root)
  })

  it('adopts a page whose build id matches the client', () => {
    // The counterpart: corresponding artifacts still adopt, so the id costs a
    // matching deployment nothing.
    const root = mountServerHtml(
      serializeHydratable(buildView(() => h.main([], [h.span([], ['hi'])]))),
    )
    root.setAttribute('data-foldkit-build', 'build-one')
    const servedSpan = root.querySelector('span')

    const patchedVNode = buildView(() =>
      __hydrateVNode(
        root,
        h.main([], [h.span([], ['hi'])]),
        undefined,
        'build-one',
      ),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('span')).toBe(servedSpan)
    expect(root.getAttribute('data-foldkit-build')).toBeNull()
  })

  it('rebuilds a stale field rather than carrying its value into a changed view', () => {
    // Build skew: the served page came from a build whose view rendered an
    // email field, and the client bundle renders a social security number from
    // the same source position. The build stamps a digest of the view module
    // into its identity, so the two identities differ and the served input is
    // rebuilt. Adopting it would move what the visitor typed into a field that
    // means something else and submits under a different name.
    const serverRoot = buildView(() =>
      h.form([], [h.input([h.Type('text'), h.Name('email')])]),
    )
    if (serverRoot === null) {
      throw new Error('expected a server root')
    }
    const [serverField] = (serverRoot.children ?? []).filter(
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (serverField === undefined) {
      throw new Error('expected a server field')
    }
    serverField.identity = 'src/page/account.ts#field@1111aaaa2222'

    const root = mountServerHtml(serializeHydratable(serverRoot))
    const servedInput = root.querySelector('input')
    if (!(servedInput instanceof HTMLInputElement)) {
      throw new Error('expected a served input')
    }
    servedInput.value = 'alice@example.com'

    const clientRoot = buildView(() =>
      h.form([], [h.input([h.Type('text'), h.Name('ssn')])]),
    )
    if (clientRoot === null) {
      throw new Error('expected a client root')
    }
    const [clientField] = (clientRoot.children ?? []).filter(
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (clientField === undefined) {
      throw new Error('expected a client field')
    }
    clientField.identity = 'src/page/account.ts#field@3333bbbb4444'

    buildView(() => __hydrateVNode(root, clientRoot))

    const hydratedInput = root.querySelector('input')
    expect(hydratedInput?.getAttribute('name')).toBe('ssn')
    expect(hydratedInput).not.toBe(servedInput)
    if (hydratedInput instanceof HTMLInputElement) {
      expect(hydratedInput.value).not.toBe('alice@example.com')
    }
  })

  it('rebuilds a root whose key disagrees with the served one', () => {
    // The root is a logical entity like any other node. A served root keyed A
    // and a client root keyed B are different entities, so adopting would carry
    // A's typed state into a root the client never rendered there.
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() => h.keyed('input')('A', [h.Type('text')])),
      ),
    )
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    root.value = 'typed-into-A'

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.keyed('input')('B', [h.Type('text')])),
    )

    const hydratedRoot = patchedVNode.elm
    expect(hydratedRoot).not.toBe(root)
    if (hydratedRoot instanceof HTMLInputElement) {
      expect(hydratedRoot.value).not.toBe('typed-into-A')
      expect(hydratedRoot.getAttribute('data-foldkit-key')).toBeNull()
    }
  })

  it('rebuilds a root whose view identity disagrees with the served one', () => {
    // Two branches of a route can render the same tag from different view
    // functions. The compiler identity is what tells them apart, so a served
    // root from one branch is never adopted by the other.
    const serverRoot = buildView(() => h.form([], [h.input([h.Type('text')])]))
    if (serverRoot === null) {
      throw new Error('expected a server root')
    }
    serverRoot.identity = 'src/page/sign-in.ts:SignInView'
    const root = mountServerHtml(serializeHydratable(serverRoot))
    const serverInput = root.querySelector('input')
    if (!(serverInput instanceof HTMLInputElement)) {
      throw new Error('expected a server input')
    }
    serverInput.value = 'typed-into-sign-in'

    const clientRoot = buildView(() => h.form([], [h.input([h.Type('text')])]))
    if (clientRoot === null) {
      throw new Error('expected a client root')
    }
    clientRoot.identity = 'src/page/sign-up.ts:SignUpView'
    const patchedVNode = buildView(() => __hydrateVNode(root, clientRoot))

    const hydratedRoot = patchedVNode.elm
    expect(hydratedRoot).not.toBe(root)
    if (hydratedRoot instanceof Element) {
      const hydratedInput = hydratedRoot.querySelector('input')
      expect(hydratedInput).not.toBe(serverInput)
      if (hydratedInput instanceof HTMLInputElement) {
        expect(hydratedInput.value).not.toBe('typed-into-sign-in')
      }
      expect(hydratedRoot.getAttribute('data-foldkit-identity')).toBeNull()
    }
  })

  it('adopts a root whose key and view identity agree with the served one', () => {
    // The counterpart: an agreeing root is adopted in place, so the identity
    // check costs a matching render nothing.
    const serverRoot = buildView(() =>
      h.keyed('form')('sign-in', [], [h.input([h.Type('text')])]),
    )
    if (serverRoot === null) {
      throw new Error('expected a server root')
    }
    serverRoot.identity = 'src/page/sign-in.ts:SignInView'
    const root = mountServerHtml(serializeHydratable(serverRoot))
    const serverInput = root.querySelector('input')

    const clientRoot = buildView(() =>
      h.keyed('form')('sign-in', [], [h.input([h.Type('text')])]),
    )
    if (clientRoot === null) {
      throw new Error('expected a client root')
    }
    clientRoot.identity = 'src/page/sign-in.ts:SignInView'
    const patchedVNode = buildView(() => __hydrateVNode(root, clientRoot))

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('input')).toBe(serverInput)
    expect(root.getAttribute('data-foldkit-key')).toBeNull()
    expect(root.getAttribute('data-foldkit-identity')).toBeNull()
  })

  it('rebuilds a keyed root when the served markup carries no hydration markers', () => {
    // Markup rendered as static output carries no marker channel at all, so a
    // client that hydrates it cannot confirm the root is the same entity. The
    // safe reading of a missing marker is disagreement.
    const root = mountServerHtml(
      serializeHtml(buildView(() => h.keyed('input')('A', [h.Type('text')]))),
    )
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    root.value = 'typed-into-A'

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.keyed('input')('A', [h.Type('text')])),
    )

    expect(patchedVNode.elm).not.toBe(root)
  })

  it('fires insert hooks once for adopted elements, children first', () => {
    const view = buildView(() => h.div([], [h.span([h.Id('inner')], ['x'])]))
    const root = mountServerHtml(serializeHydratable(view))

    const inserted: Array<string> = []
    const nextVNode = buildView(() =>
      h.div([], [h.span([h.Id('inner')], ['x'])]),
    )
    const attachInsertHook = (vnode: VNode, name: string): void => {
      vnode.data ??= {}
      vnode.data.hook = {
        insert: () => {
          inserted.push(name)
        },
      }
    }
    if (nextVNode === null) {
      throw new Error('expected the hydration view to produce a vnode')
    }
    attachInsertHook(nextVNode, 'parent')
    const maybeChild = Array_.findFirst(
      nextVNode.children ?? [],
      (candidate): candidate is VNode => typeof candidate !== 'string',
    )
    if (Option.isSome(maybeChild)) {
      attachInsertHook(maybeChild.value, 'child')
    }

    buildView(() => __hydrateVNode(root, nextVNode))

    expect(inserted).toEqual(['child', 'parent'])
  })

  it('fires insert hooks children-first across adopted and created siblings', () => {
    // The server rendered one child; the client's first view has two. The
    // differ queues a hook when it creates a node and flushes at the end of the
    // patch, so firing created hooks from that queue and adopted hooks
    // afterward would run the created sibling's Mount before the adopted one's,
    // the reverse of a fresh render. A Mount that depends on a sibling being
    // initialized would work on a fresh boot and break on a hydrated one.
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() => h.main([], [h.span([h.Id('first')], ['a'])])),
      ),
    )

    const inserted: Array<string> = []
    const attachInsertHook = (vnode: VNode, name: string): void => {
      vnode.data ??= {}
      vnode.data.hook = {
        insert: () => {
          inserted.push(name)
        },
      }
    }

    const buildTree = (): VNode => {
      const tree = buildView(() =>
        h.main(
          [],
          [h.span([h.Id('first')], ['a']), h.div([h.Id('second')], ['b'])],
        ),
      )
      if (tree === null) {
        throw new Error('expected the view to produce a vnode')
      }
      const [first, second] = (tree.children ?? []).filter(
        (candidate): candidate is VNode => typeof candidate !== 'string',
      )
      attachInsertHook(tree, 'root')
      if (first !== undefined) {
        attachInsertHook(first, 'first')
      }
      if (second !== undefined) {
        attachInsertHook(second, 'second')
      }
      return tree
    }

    buildView(() => __hydrateVNode(root, buildTree()))

    expect(inserted).toEqual(['first', 'second', 'root'])
  })

  it('fires insert hooks in the same order as a fresh render', () => {
    // The same tree rendered from nothing is the reference order, so hydration
    // is compared against it rather than against a hand-written expectation.
    const inserted: Array<string> = []
    const attachInsertHook = (vnode: VNode, name: string): void => {
      vnode.data ??= {}
      vnode.data.hook = {
        insert: () => {
          inserted.push(name)
        },
      }
    }
    const buildTree = (): VNode => {
      const tree = buildView(() =>
        h.main(
          [],
          [
            h.span([h.Id('first')], ['a']),
            h.div([h.Id('second')], [h.em([h.Id('nested')], ['c'])]),
          ],
        ),
      )
      if (tree === null) {
        throw new Error('expected the view to produce a vnode')
      }
      attachInsertHook(tree, 'root')
      const [first, second] = (tree.children ?? []).filter(
        (candidate): candidate is VNode => typeof candidate !== 'string',
      )
      if (first !== undefined) {
        attachInsertHook(first, 'first')
      }
      if (second !== undefined) {
        attachInsertHook(second, 'second')
        const [nested] = (second.children ?? []).filter(
          (candidate): candidate is VNode => typeof candidate !== 'string',
        )
        if (nested !== undefined) {
          attachInsertHook(nested, 'nested')
        }
      }
      return tree
    }

    const freshHost = document.createElement('div')
    document.body.appendChild(freshHost)
    buildView(() => patch(toVNode(freshHost), buildTree()))
    const freshOrder = [...inserted]
    freshHost.remove()

    inserted.length = 0
    const root = mountServerHtml(
      serializeHydratable(
        buildView(() => h.main([], [h.span([h.Id('first')], ['a'])])),
      ),
    )
    buildView(() => __hydrateVNode(root, buildTree()))

    expect(inserted).toEqual(freshOrder)
  })

  it('rebuilds a text vnode when the server element carries stray markup', () => {
    const root = mountServerHtml('<p><b>stale</b></p>')

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.p([], ['fresh'])),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('b')).toBeNull()
    expect(root.textContent).toBe('fresh')
  })

  it('adopts a text vnode when the server element holds a single text node', () => {
    const root = mountServerHtml('<p>same</p>')
    const textNode = root.firstChild

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.p([], ['same'])),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.firstChild).toBe(textNode)
  })

  it('clears stale server children under a childless vnode', () => {
    const root = mountServerHtml('<div id="slot"><span>stale</span></div>')
    expect(root.querySelector('span')).not.toBeNull()

    buildView(() => __hydrateVNode(root, h.div([h.Id('slot')])))

    expect(root.querySelector('span')).toBeNull()
    expect(root.childNodes.length).toBe(0)
  })

  it('re-asserts controlled input values over user edits', () => {
    const view = buildView(() => h.input([h.Type('text'), h.Value('model')]))
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    root.value = 'typed before boot'

    buildView(() =>
      __hydrateVNode(root, h.input([h.Type('text'), h.Value('model')])),
    )

    expect(root.value).toBe('model')
  })

  it('re-asserts controlled textarea values over user edits', () => {
    const view = buildView(() => h.textarea([h.Value('model')]))
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLTextAreaElement)) {
      throw new Error('expected a textarea root')
    }
    root.value = 'typed before boot'

    buildView(() => __hydrateVNode(root, h.textarea([h.Value('model')])))

    expect(root.value).toBe('model')
  })

  it('adopts a controlled select and re-asserts the selected option', () => {
    const selectView = () =>
      h.select(
        [h.Value('us')],
        [
          h.option([h.Value('')], ['Choose']),
          h.option([h.Value('us')], ['United States']),
        ],
      )
    const view = buildView(selectView)
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLSelectElement)) {
      throw new Error('expected a select root')
    }
    expect(root.value).toBe('us')
    const serverOption = root.querySelector('option[value="us"]')
    root.value = ''

    buildView(() => __hydrateVNode(root, selectView()))

    expect(root.value).toBe('us')
    expect(root.querySelector('option[value="us"]')).toBe(serverOption)
  })

  it('keeps an adopted innerHTML subtree when the markup round-trips unchanged', () => {
    const view = buildView(() => h.div([h.InnerHTML('<em>raw</em>')]))
    const root = mountServerHtml(serializeHydratable(view))
    const emphasis = root.querySelector('em')
    expect(emphasis).not.toBeNull()

    buildView(() => __hydrateVNode(root, h.div([h.InnerHTML('<em>raw</em>')])))

    expect(root.querySelector('em')).toBe(emphasis)
    expect(root.textContent).toBe('raw')
  })

  it('adopts an innerHTML subtree the parser normalized away from the authored markup', () => {
    const authoredMarkup = '<em>say &quot;hi&quot;</em>'
    const view = buildView(() => h.div([h.InnerHTML(authoredMarkup)]))
    const root = mountServerHtml(serializeHydratable(view))
    const emphasis = root.querySelector('em')
    expect(emphasis).not.toBeNull()
    expect(root.innerHTML).not.toBe(authoredMarkup)

    buildView(() => __hydrateVNode(root, h.div([h.InnerHTML(authoredMarkup)])))

    expect(root.querySelector('em')).toBe(emphasis)
    expect(root.textContent).toBe('say "hi"')
  })

  it('adopts an SVG innerHTML subtree whose markup uses camelCase attributes', () => {
    const authoredMarkup = '<path pathLength="100" d="M0 0L10 10"></path>'
    const svgView = () => h.svg([h.InnerHTML(authoredMarkup)])
    const view = buildView(svgView)
    const root = mountServerHtml(serializeHydratable(view))
    const serverPath = root.querySelector('path')
    expect(serverPath).not.toBeNull()

    buildView(() => __hydrateVNode(root, svgView()))

    expect(root.querySelector('path')).toBe(serverPath)
  })

  it('adopts a MathML subtree by namespace', () => {
    const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'
    const math = document.createElementNS(MATHML_NAMESPACE, 'math')
    const mi = document.createElementNS(MATHML_NAMESPACE, 'mi')
    mi.textContent = 'x'
    math.appendChild(mi)
    host.appendChild(math)

    buildView(() => __hydrateVNode(math, h.math([], [h.mi([], ['x'])])))

    const adoptedMi = math.querySelector('mi')
    expect(adoptedMi).toBe(mi)
    expect(math.namespaceURI).toBe(MATHML_NAMESPACE)
    expect(adoptedMi?.namespaceURI).toBe(MATHML_NAMESPACE)
  })

  it('adopts an mglyph child inside a MathML text integration point', () => {
    const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'
    const math = document.createElementNS(MATHML_NAMESPACE, 'math')
    const mi = document.createElementNS(MATHML_NAMESPACE, 'mi')
    const mglyph = document.createElementNS(MATHML_NAMESPACE, 'mglyph')
    mi.appendChild(mglyph)
    math.appendChild(mi)
    host.appendChild(math)

    buildView(() =>
      __hydrateVNode(math, h.math([], [h.mi([], [h.mglyph([])])])),
    )

    const adoptedMglyph = math.querySelector('mglyph')
    expect(adoptedMglyph).toBe(mglyph)
    expect(adoptedMglyph?.namespaceURI).toBe(MATHML_NAMESPACE)
  })

  it('adopts an HTML child inside annotation-xml with an HTML encoding', () => {
    const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML'
    const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
    const math = document.createElementNS(MATHML_NAMESPACE, 'math')
    const annotationXml = document.createElementNS(
      MATHML_NAMESPACE,
      'annotation-xml',
    )
    annotationXml.setAttribute('encoding', 'text/html')
    const div = document.createElement('div')
    div.textContent = 'x'
    annotationXml.appendChild(div)
    math.appendChild(annotationXml)
    host.appendChild(math)

    buildView(() =>
      __hydrateVNode(
        math,
        h.math(
          [],
          [
            h['annotation-xml'](
              [h.Attribute('encoding', 'text/html')],
              [h.div([], ['x'])],
            ),
          ],
        ),
      ),
    )

    expect(math.querySelector('annotation-xml')).toBe(annotationXml)
    const adoptedDiv = math.querySelector('div')
    expect(adoptedDiv).toBe(div)
    expect(adoptedDiv?.namespaceURI).toBe(HTML_NAMESPACE)
  })

  it('preserves state a custom element added before hydration', () => {
    class XOwned extends HTMLElement {
      connectedCallback(): void {
        this.setAttribute('role', 'button')
        this.setAttribute('data-ready', 'yes')
        const span = this.ownerDocument.createElement('span')
        span.textContent = 'owned'
        this.appendChild(span)
      }
    }
    if (customElements.get('x-owned') === undefined) {
      customElements.define('x-owned', XOwned)
    }

    // The element upgrades and runs connectedCallback when it connects, before
    // hydration adopts it.
    const element = document.createElement('x-owned')
    host.appendChild(element)
    expect(element.getAttribute('role')).toBe('button')
    expect(element.querySelector('span')?.textContent).toBe('owned')

    buildView(() => __hydrateVNode(element, snabbdomH('x-owned', [])))

    expect(element.getAttribute('role')).toBe('button')
    expect(element.getAttribute('data-ready')).toBe('yes')
    expect(element.querySelector('span')?.textContent).toBe('owned')
  })

  it('keeps custom element classes and styles the view does not declare', () => {
    class XStyled extends HTMLElement {
      connectedCallback(): void {
        this.classList.add('owned')
        this.style.backgroundColor = 'red'
      }
    }
    if (customElements.get('x-styled') === undefined) {
      customElements.define('x-styled', XStyled)
    }

    // NOTE: the server DOM carries the view's declared class and style; the
    // component adds its own on upgrade, before hydration adopts the element.
    const element = document.createElement('x-styled')
    element.setAttribute('class', 'client')
    element.setAttribute('style', 'color: blue')
    host.appendChild(element)
    expect(element.classList.contains('owned')).toBe(true)
    expect(element.style.getPropertyValue('background-color')).toBe('red')

    buildView(() =>
      __hydrateVNode(
        element,
        snabbdomH('x-styled', {
          class: { client: true },
          style: { color: 'blue' },
        }),
      ),
    )

    expect(element.classList.contains('client')).toBe(true)
    expect(element.classList.contains('owned')).toBe(true)
    expect(element.style.getPropertyValue('color')).toBe('blue')
    expect(element.style.getPropertyValue('background-color')).toBe('red')
  })

  it('gives the view ownership of custom element light DOM it declares', () => {
    class XSame extends HTMLElement {
      connectedCallback(): void {
        const paragraph = this.ownerDocument.createElement('p')
        paragraph.setAttribute('data-owner', 'component')
        paragraph.textContent = 'owned'
        this.insertBefore(paragraph, this.firstChild)
      }
    }
    if (customElements.get('x-same') === undefined) {
      customElements.define('x-same', XSame)
    }

    // NOTE: the server DOM holds the view's <p>; the component prepends a
    // same-tag <p> on upgrade. Because the vnode declares children, the view
    // owns the light DOM, so the component node must not survive as a duplicate.
    const element = document.createElement('x-same')
    const serverParagraph = document.createElement('p')
    serverParagraph.setAttribute('data-owner', 'view')
    serverParagraph.textContent = 'client'
    element.appendChild(serverParagraph)
    host.appendChild(element)
    expect(element.querySelectorAll('p').length).toBe(2)

    buildView(() =>
      __hydrateVNode(
        element,
        snabbdomH('x-same', {}, [
          snabbdomH('p', { attrs: { 'data-owner': 'view' } }, 'client'),
        ]),
      ),
    )

    const paragraphs = element.querySelectorAll('p')
    expect(paragraphs.length).toBe(1)
    expect(paragraphs[0]?.getAttribute('data-owner')).toBe('view')
    expect(paragraphs[0]?.textContent).toBe('client')
  })

  it('removes the server-stamped selected attribute from an adopted option', () => {
    const selectView = () =>
      h.select(
        [h.Value('us')],
        [
          h.option([h.Value('')], ['Choose']),
          h.option([h.Value('us')], ['United States']),
        ],
      )
    const view = buildView(selectView)
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLSelectElement)) {
      throw new Error('expected a select root')
    }
    const serverOption = root.querySelector('option[value="us"]')
    expect(serverOption?.hasAttribute('selected')).toBe(true)

    buildView(() => __hydrateVNode(root, selectView()))

    expect(root.querySelector('option[value="us"]')).toBe(serverOption)
    expect(serverOption?.hasAttribute('selected')).toBe(false)
    expect(root.value).toBe('us')
  })

  it('removes the server-stamped value attribute so an adopted input matches a fresh boot', () => {
    const inputView = () => h.input([h.Type('text'), h.Value('hello')])
    const view = buildView(inputView)
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    expect(root.hasAttribute('value')).toBe(true)

    buildView(() => __hydrateVNode(root, inputView()))

    expect(root.value).toBe('hello')
    expect(root.hasAttribute('value')).toBe(false)
    expect(root.defaultValue).toBe('')
  })

  it('removes the server-stamped checked attribute from an adopted checkbox', () => {
    const checkboxView = () => h.input([h.Type('checkbox'), h.Checked(true)])
    const view = buildView(checkboxView)
    const root = mountServerHtml(serializeHydratable(view))
    if (!(root instanceof HTMLInputElement)) {
      throw new Error('expected an input root')
    }
    expect(root.hasAttribute('checked')).toBe(true)

    buildView(() => __hydrateVNode(root, checkboxView()))

    expect(root.checked).toBe(true)
    expect(root.hasAttribute('checked')).toBe(false)
    expect(root.defaultChecked).toBe(false)
  })

  it('removes stale server attributes, classes, and styles the client view drops', () => {
    const serverView = () =>
      h.a(
        [
          h.Class('stale'),
          h.DataAttribute('old', 'yes'),
          h.Href('/stale'),
          h.Style({ color: 'red' }),
        ],
        ['same'],
      )
    const clientView = () => h.a([h.Class('fresh'), h.Title('new')], ['same'])
    const root = mountServerHtml(serializeHydratable(buildView(serverView)))
    if (!(root instanceof HTMLAnchorElement)) {
      throw new Error('expected an anchor root')
    }

    buildView(() => __hydrateVNode(root, clientView()))

    expect(root.className).toBe('fresh')
    expect(root.getAttribute('title')).toBe('new')
    expect(root.hasAttribute('data-old')).toBe(false)
    expect(root.hasAttribute('href')).toBe(false)
    expect(root.style.color).toBe('')
  })

  it('converges a deterministic class and style set through raw attributes', () => {
    const view = () =>
      h.div(
        [h.Attribute('class', 'same'), h.Attribute('style', 'color: blue')],
        ['content'],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    if (!(root instanceof HTMLDivElement)) {
      throw new Error('expected a div root')
    }

    buildView(() => __hydrateVNode(root, view()))

    expect(root.getAttribute('class')).toBe('same')
    expect(root.className).toBe('same')
    expect(root.getAttribute('style')).toBe('color: blue')
    expect(root.style.color).toBe('blue')
  })

  it('converges class and style set through both a raw attribute and the typed module', () => {
    const view = () =>
      h.div(
        [
          h.Attribute('class', 'raw'),
          h.Class('typed'),
          h.Attribute('style', 'background: red'),
          h.Style({ color: 'blue' }),
        ],
        ['content'],
      )
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    if (!(root instanceof HTMLDivElement)) {
      throw new Error('expected a div root')
    }

    buildView(() => __hydrateVNode(root, view()))

    expect(root.classList.contains('raw')).toBe(true)
    expect(root.classList.contains('typed')).toBe(true)
    expect(root.style.getPropertyValue('background')).toContain('red')
    expect(root.style.color).toBe('blue')
  })

  it('replaces a hydration root whose namespace disagrees with the vnode', () => {
    const htmlSvg = document.createElement('svg')
    htmlSvg.setAttribute('data-foldkit-app', 'app')
    host.appendChild(htmlSvg)

    buildView(() => __hydrateVNode(htmlSvg, h.svg([], [h.circle([])])))

    const root = host.firstElementChild
    expect(root).not.toBe(htmlSvg)
    expect(root?.namespaceURI).toBe('http://www.w3.org/2000/svg')
  })

  it('rebuilds an adopted element whose namespace disagrees with the DOM', () => {
    const root = mountServerHtml('<div><a>link</a></div>')
    const originalAnchor = root.firstElementChild

    buildView(() =>
      __hydrateVNode(
        root,
        snabbdomH('div', {}, [
          snabbdomH('a', { ns: 'http://www.w3.org/2000/svg' }, 'link'),
        ]),
      ),
    )

    const anchor = root.firstElementChild
    expect(anchor).not.toBe(originalAnchor)
    expect(anchor?.namespaceURI).toBe('http://www.w3.org/2000/svg')
  })

  it('resets a controlled textarea default so hydration matches a fresh boot', () => {
    const textareaView = () => h.textarea([h.Value('model')])
    const root = mountServerHtml(serializeHydratable(buildView(textareaView)))
    if (!(root instanceof HTMLTextAreaElement)) {
      throw new Error('expected a textarea root')
    }
    expect(root.textContent).toBe('model')

    buildView(() => __hydrateVNode(root, textareaView()))

    expect(root.value).toBe('model')
    expect(root.defaultValue).toBe('')
  })

  it('hydrates an uncontrolled textarea preserving its server content', () => {
    const view = () => h.textarea([], ['default text'])
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    if (!(root instanceof HTMLTextAreaElement)) {
      throw new Error('expected a textarea root')
    }

    const patchedVNode = buildView(() => __hydrateVNode(root, view()))

    expect(patchedVNode.elm).toBe(root)
    expect(root.value).toBe('default text')
  })

  it('hydrates empty text children without rebuilding the root', () => {
    const view = () => h.div([], ['', h.span([h.Id('inner')], ['x']), ''])
    const root = mountServerHtml(serializeHydratable(buildView(view)))
    const span = root.querySelector('#inner')

    const patchedVNode = buildView(() => __hydrateVNode(root, view()))

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('#inner')).toBe(span)
  })

  it('hydrates a pre whose empty text precedes newline-prefixed text', () => {
    // The serializer pads this view to <pre>\n\nfirst</pre>; a real browser
    // strips one leading newline from <pre>, so the accepted server DOM holds
    // "\nfirst". (happy-dom's innerHTML parser does not strip it, so the DOM is
    // built directly to match what the render walk's parser and a browser see.)
    const root = document.createElement('pre')
    root.textContent = '\nfirst'
    host.appendChild(root)

    const view = () => h.pre([], ['', '\nfirst'])
    const patchedVNode = buildView(() => __hydrateVNode(root, view()))

    expect(patchedVNode.elm).toBe(root)
    expect(root.textContent).toBe('\nfirst')
  })

  it('rebuilds when the server element holds markup where the view expects text children', () => {
    const root = mountServerHtml('<p><b>stale</b> markup</p>')

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.p([], ['plain ', 'text'])),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.querySelector('b')).toBeNull()
    expect(root.textContent).toBe('plain text')
  })

  it('adopts comment children and text-shortcut elements', () => {
    const root = mountServerHtml('<div><!--note--><span>after</span></div>')
    const commentNode = root.firstChild

    const patchedVNode = __hydrateVNode(
      root,
      snabbdomH('div', {}, [
        snabbdomH('!', 'note'),
        snabbdomH('span', {}, 'after'),
      ]),
    )

    expect(patchedVNode.elm).toBe(root)
    expect(root.firstChild).toBe(commentNode)
    expect(root.textContent).toBe('after')
  })

  it('falls back to a replace boot on a root tag mismatch', () => {
    const root = mountServerHtml('<main><p>stale</p></main>')

    const patchedVNode = buildView(() =>
      __hydrateVNode(root, h.div([h.Class('fresh')], [h.p([], ['fresh'])])),
    )

    expect(patchedVNode.elm).not.toBe(root)
    expect(host.firstElementChild?.tagName.toLowerCase()).toBe('div')
    expect(host.firstElementChild?.textContent).toBe('fresh')
  })

  it('hydrates a null view as a comment replacement', () => {
    const root = mountServerHtml('<div>stale</div>')

    const patchedVNode = buildView(() => __hydrateVNode(root, null))

    expect(patchedVNode.sel).toBe('!')
    expect(host.firstElementChild).toBeNull()
  })
})

describe('__elementSignature', () => {
  it('is order-independent across attributes, classes, and styles', () => {
    const a = document.createElement('div')
    a.setAttribute('title', 'x')
    a.setAttribute('lang', 'en')
    a.className = 'one two'
    a.style.color = 'red'
    a.style.margin = '0px'

    const b = document.createElement('div')
    b.setAttribute('lang', 'en')
    b.setAttribute('title', 'x')
    b.className = 'two one'
    b.style.margin = '0px'
    b.style.color = 'red'

    const vnode = snabbdomH('div', {}, [])
    expect(__elementSignature(a, vnode)).toBe(__elementSignature(b, vnode))
  })

  it('catches a raw value attribute disagreement the client owns as an attribute', () => {
    const server = document.createElement('input')
    server.setAttribute('value', 'server')
    const client = document.createElement('input')
    client.setAttribute('value', 'client')

    const vnode = snabbdomH('input', { attrs: { value: 'client' } }, [])
    expect(__elementSignature(server, vnode)).not.toBe(
      __elementSignature(client, vnode),
    )
  })

  it('does not flag a props-managed attribute the client drops from the DOM', () => {
    const server = document.createElement('input')
    server.setAttribute('value', 'text')
    server.value = 'text'
    const client = document.createElement('input')
    client.value = 'text'

    const vnode = snabbdomH('input', { props: { value: 'text' } }, [])
    expect(__elementSignature(server, vnode)).toBe(
      __elementSignature(client, vnode),
    )
  })

  it('catches a props-managed value disagreement through the property', () => {
    const server = document.createElement('input')
    server.value = 'server'
    const client = document.createElement('input')
    client.value = 'client'

    const vnode = snabbdomH('input', { props: { value: 'client' } }, [])
    expect(__elementSignature(server, vnode)).not.toBe(
      __elementSignature(client, vnode),
    )
  })

  it('keeps attribute values with delimiter characters distinct', () => {
    const a = document.createElement('div')
    a.setAttribute('data-note', 'p:q;r|s')
    const b = document.createElement('div')
    b.setAttribute('data-note', 'p:q;r|t')

    const vnode = snabbdomH('div', {}, [])
    expect(__elementSignature(a, vnode)).not.toBe(__elementSignature(b, vnode))
  })
})
