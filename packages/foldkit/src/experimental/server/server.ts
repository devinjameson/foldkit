import {
  Array as Array_,
  Context,
  Data,
  Effect,
  Option,
  Predicate,
  Schema,
  pipe,
} from 'effect'
import type { DefaultTreeAdapterMap } from 'parse5'
import { parseFragment } from 'parse5'

import { beginRender, createBoundaryRegistry } from '../../html/boundary.js'
import {
  type Document,
  type HtmlBuilder,
  __htmlBuilder as htmlBuilderFor,
  textDirectionToAttribute,
} from '../../html/index.js'
import {
  type DispatchSync,
  clearRuntime,
  setRuntime,
} from '../../html/runtimeSingleton.js'
import {
  FOLDKIT_APP_ATTRIBUTE,
  FOLDKIT_FLAGS_ATTRIBUTE,
} from '../../hydrationMarker.js'
import type { VNode } from '../../snabbdom/vnode.js'
import { tagNameFromSelector } from '../../tagName.js'
import { Url, fromString } from '../../url/index.js'
import {
  escapeAttributeValue,
  serializeHtml,
  textareaContent,
} from './serialize.js'

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'

type Parse5ChildNode = DefaultTreeAdapterMap['childNode']
type Parse5Element = DefaultTreeAdapterMap['element']

const isParse5Element = (node: Parse5ChildNode): node is Parse5Element =>
  'tagName' in node

const isIgnorableText = (node: Parse5ChildNode): boolean =>
  node.nodeName === '#text' && 'value' in node && node.value.trim() === ''

type VnodeChild =
  | Readonly<{ kind: 'Element'; vnode: VNode }>
  | Readonly<{ kind: 'Text'; text: string }>
  | Readonly<{ kind: 'Comment'; text: string }>

type ParsedChild =
  | Readonly<{ kind: 'Element'; element: Parse5Element }>
  | Readonly<{ kind: 'Text'; text: string }>
  | Readonly<{ kind: 'Comment'; text: string }>

// The children a vnode declares, with consecutive text merged into one run.
// The serializer emits adjacent text children back to back, so the parser
// reads them as a single text node; merging both sides makes them comparable.
// A zero-length run is dropped: the serializer emits no node for empty text,
// so the parser produces none either.
const normalizeVnodeChildren = (vnode: VNode): ReadonlyArray<VnodeChild> => {
  const children = vnode.children
  if (children === undefined) {
    return []
  }
  const items: Array<VnodeChild> = []
  let text = ''
  const flush = (): void => {
    if (text !== '') {
      items.push({ kind: 'Text', text })
    }
    text = ''
  }
  for (const child of children) {
    if (typeof child === 'string') {
      text += child
      continue
    }
    const selector = child.sel
    if (selector === undefined || selector === '') {
      text += child.text ?? ''
    } else if (selector === '!') {
      flush()
      items.push({ kind: 'Comment', text: child.text ?? '' })
    } else {
      flush()
      items.push({ kind: 'Element', vnode: child })
    }
  }
  flush()
  return items
}

const normalizeParsedChildren = (
  node: Parse5Element,
): ReadonlyArray<ParsedChild> => {
  const items: Array<ParsedChild> = []
  let text = ''
  const flush = (): void => {
    if (text !== '') {
      items.push({ kind: 'Text', text })
    }
    text = ''
  }
  for (const child of node.childNodes) {
    if (isParse5Element(child)) {
      flush()
      items.push({ kind: 'Element', element: child })
    } else if (child.nodeName === '#text' && 'value' in child) {
      text += child.value
    } else if (child.nodeName === '#comment' && 'data' in child) {
      flush()
      items.push({ kind: 'Comment', text: child.data })
    }
  }
  flush()
  return items
}

// The children a `<textarea>` serializes to. A controlled textarea emits its
// `value` prop as its text content (the serializer's leading-newline padding
// and the parser's leading-newline strip cancel, so the parsed text is the
// value verbatim), which the walk represents as a single text run, empty value
// omitted. An uncontrolled textarea serializes its own children, so they are
// validated normally, rejecting element children the parser folds into RCDATA
// text.
const expectedTextareaChildren = (vnode: VNode): ReadonlyArray<VnodeChild> => {
  const content = textareaContent(vnode.data?.props)
  if (content === undefined) {
    return normalizeVnodeChildren(vnode)
  }
  return content === '' ? [] : [{ kind: 'Text', text: content }]
}

const structureMismatch = (parsed: Parse5Element): Error =>
  new Error(
    `[foldkit] HTML parsing changed the child structure inside ` +
      `<${parsed.tagName}>. It inserts, moves, or drops nodes the view did ` +
      'not write (a <tbody> around a bare <tr> in a <table>, text ' +
      'foster-parented out of a <table>), which hydration would rebuild as a ' +
      'mismatch. Write the structure HTML parsing produces, such as explicit ' +
      'table sections.',
  )

// Compare the child structure the browser parsed against the structure the
// view declared, recursively. The top-level check rejects a root that splits
// into siblings; this rejects a parser correction inside the root, whether an
// inserted element (the `<tbody>` a browser adds around a bare `<tr>`) or
// foster-parented text, which hydration would otherwise see as a whole-subtree
// mismatch.
const assertStructureMatches = (parsed: Parse5Element, vnode: VNode): void => {
  // InnerHTML owns an opaque, parser-produced subtree that the vnode does not
  // model as children, so it is left unwalked.
  if (vnode.data?.props?.['innerHTML'] !== undefined) {
    return
  }
  const parsedChildren = normalizeParsedChildren(parsed)
  const vnodeChildren =
    parsed.tagName.toLowerCase() === 'textarea'
      ? expectedTextareaChildren(vnode)
      : normalizeVnodeChildren(vnode)
  if (parsedChildren.length !== vnodeChildren.length) {
    throw structureMismatch(parsed)
  }
  for (const [parsedChild, vnodeChild] of Array_.zip(
    parsedChildren,
    vnodeChildren,
  )) {
    if (parsedChild.kind !== vnodeChild.kind) {
      throw structureMismatch(parsed)
    }
    if (parsedChild.kind === 'Element' && vnodeChild.kind === 'Element') {
      const expectedTag = tagNameFromSelector(
        vnodeChild.vnode.sel ?? '',
      ).toLowerCase()
      const expectedNamespace =
        typeof vnodeChild.vnode.data?.ns === 'string'
          ? vnodeChild.vnode.data.ns
          : HTML_NAMESPACE
      if (
        parsedChild.element.tagName.toLowerCase() !== expectedTag ||
        parsedChild.element.namespaceURI !== expectedNamespace
      ) {
        throw new Error(
          `[foldkit] HTML parsing produced <${parsedChild.element.tagName}> ` +
            `where the view declared <${expectedTag}> inside ` +
            `<${parsed.tagName}>. The browser inserts or reorders elements (a ` +
            '<tbody> around a bare <tr> in a <table>) that hydration would ' +
            'rebuild as a mismatch. Write the structure HTML parsing produces.',
        )
      }
      assertStructureMatches(parsedChild.element, vnodeChild.vnode)
    } else if (parsedChild.kind === 'Text' && vnodeChild.kind === 'Text') {
      if (parsedChild.text !== vnodeChild.text) {
        throw structureMismatch(parsed)
      }
    } else if (
      parsedChild.kind === 'Comment' &&
      vnodeChild.kind === 'Comment'
    ) {
      if (parsedChild.text !== vnodeChild.text) {
        throw structureMismatch(parsed)
      }
    }
  }
}

// After serialization, parse the stamped root markup with the same HTML parser
// a browser uses and require it to describe exactly one element: the stamped
// root, with the tag and namespace the view produced. A view can serialize a
// structurally invalid shape the parser rearranges (a block element inside a
// `<p>`, a stray element inside a `<table>`, an HTML element inside `<svg>`),
// moving nodes outside the element the client hydrates. Hydration owns only
// that root, so it cannot remove escaped siblings; rejecting here keeps the
// invariant that the served root parses back to the single intended element.
const assertSingleStampedRoot = (
  html: string,
  runtimeId: string,
  root: NonNullable<Document['body']>,
): void => {
  const fragment = parseFragment(html)
  const significant = fragment.childNodes.filter(node => !isIgnorableText(node))
  const only = significant[0]
  if (
    significant.length !== 1 ||
    only === undefined ||
    !isParse5Element(only)
  ) {
    throw new Error(
      '[foldkit] The rendered root serialized to markup that HTML parsing ' +
        'splits into more than one top-level node. An element the parser ' +
        'moves out of its parent (a block element inside a <p>, a stray ' +
        'element inside a <table>, or an HTML element inside an <svg>) ' +
        'leaves content outside the application root that hydration cannot ' +
        'own. Keep the view root a single, structurally valid element tree.',
    )
  }
  const stamp = only.attrs.find(
    attribute => attribute.name === FOLDKIT_APP_ATTRIBUTE,
  )
  if (stamp?.value !== runtimeId) {
    throw new Error(
      '[foldkit] HTML parsing moved the hydration marker off the rendered ' +
        'root, so the served DOM would not carry the stamp the client ' +
        'adopts. Keep the view root a single, structurally valid element.',
    )
  }
  const expectedTag = tagNameFromSelector(root.sel ?? '').toLowerCase()
  const expectedNamespace =
    typeof root.data?.ns === 'string' ? root.data.ns : HTML_NAMESPACE
  if (
    only.tagName.toLowerCase() !== expectedTag ||
    only.namespaceURI !== expectedNamespace
  ) {
    throw new Error(
      '[foldkit] HTML parsing reinterpreted the rendered root as a ' +
        `<${only.tagName}>, not the view's <${expectedTag}>. Keep the view ` +
        'root a single, structurally valid element.',
    )
  }
  assertStructureMatches(only, root)
}

export { FOLDKIT_APP_ATTRIBUTE, FOLDKIT_FLAGS_ATTRIBUTE }

const DEFAULT_RUNTIME_ID = 'app'

/** The server render of one request: the stamped root markup (plus the Flags
 *  payload script when the application declares Flags) and the `Document`
 *  head fields for the host to place into its HTML template.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderedApplication = Readonly<{
  html: string
  title: string
  lang?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  canonical?: string
  ogUrl?: string
}>

/** Failure of a routing render whose `url` option cannot be parsed.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class InvalidServerUrl extends Data.TaggedError('InvalidServerUrl')<{
  url: string
}> {}

/** Failure producing the Flags payload: the Schema encode step rejected the
 *  Flags value, the encoded value could not be serialized to JSON, or the
 *  encoded value could not be decoded back for the hydration-consistent
 *  render.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class ServerFlagsEncodeError extends Data.TaggedError(
  'ServerFlagsEncodeError',
)<{
  cause: unknown
}> {}

/** Failure serializing the view-produced vnode tree to safe HTML.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class ServerSerializationError extends Data.TaggedError(
  'ServerSerializationError',
)<{
  cause: unknown
}> {}

/** Failure of a render whose `runtimeId` is empty.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class InvalidRuntimeId extends Data.TaggedError('InvalidRuntimeId')<{
  runtimeId: string
}> {}

/** Failure of a hydratable render whose view did not return an element root.
 * Text, comments, and an empty body cannot carry the hydration marker the
 * client runtime uses to adopt the server-rendered DOM.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export class InvalidHydrationRoot extends Data.TaggedError(
  'InvalidHydrationRoot',
)<{
  rootKind: 'Empty' | 'Text' | 'Comment'
}> {}

/** Union of the failures {@link renderToString} can produce.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerRenderError =
  | InvalidServerUrl
  | ServerFlagsEncodeError
  | ServerSerializationError
  | InvalidRuntimeId
  | InvalidHydrationRoot

type InitReturn<Model> = readonly [Model, ReadonlyArray<unknown>]

/** Server-side subset of a routing `makeApplication` config with Flags. The
 *  full application config is structurally assignable; `container`, `update`,
 *  and `subscriptions` play no part in a server render.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerRoutingApplicationConfigWithFlags<Model, Flags> = Readonly<{
  Flags: Schema.Codec<Flags, any, never, never>
  routing: unknown
  init: (flags: Flags, url: Url) => InitReturn<Model>
  view: (model: Model, h: HtmlBuilder<any>) => Document
}>

/** Server-side subset of a routing `makeApplication` config without Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerRoutingApplicationConfig<Model> = Readonly<{
  routing: unknown
  init: (url: Url) => InitReturn<Model>
  view: (model: Model, h: HtmlBuilder<any>) => Document
}>

/** Server-side subset of a non-routing `makeApplication` config with Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerApplicationConfigWithFlags<Model, Flags> = Readonly<{
  Flags: Schema.Codec<Flags, any, never, never>
  init: (flags: Flags) => InitReturn<Model>
  view: (model: Model, h: HtmlBuilder<any>) => Document
}>

/** Server-side subset of a non-routing `makeApplication` config.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type ServerApplicationConfig<Model> = Readonly<{
  init: () => InitReturn<Model>
  view: (model: Model, h: HtmlBuilder<any>) => Document
}>

/** Options common to every render. `runtimeId` names the application in the
 *  root stamp and Flags payload; it defaults to `'app'` and must be non-empty.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderOptions = Readonly<{
  runtimeId?: string
  /**
   * Whether the output carries the hydration contract: the
   * `data-foldkit-app` root stamp and, for Flags applications, the Flags
   * payload script. Defaults to `true` for both request-time rendering and
   * build-time static generation. A hydratable static page must use universal,
   * build-stable Flags; resolve visitor-specific browser facts after hydration
   * through Commands or Subscriptions. Pass `false` only when producing static
   * markup that the client will not hydrate.
   */
  isHydratable?: boolean
}>

/** Render options for a routing application, adding the request URL.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderUrlOptions = RenderOptions &
  Readonly<{
    url: string
  }>

/** Render options for a Flags application, adding the per-request Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderFlagsOptions<Flags> = RenderOptions &
  Readonly<{
    flags: Flags
  }>

/** Render options for a routing Flags application: the request URL plus the
 *  per-request Flags.
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export type RenderUrlFlagsOptions<Flags> = RenderUrlOptions &
  RenderFlagsOptions<Flags>

const noOpDispatch: DispatchSync = () => {}

// NOTE: the html builder reads its dispatch context from a process-wide
// frame stack (`setRuntime` / `clearRuntime`) rather than an argument, so
// this push/render/pop bracket must never interleave with another render's.
// It cannot: JavaScript switches tasks only at async boundaries, and the
// bracket is fully synchronous (`view` returns a Document without awaiting),
// so it runs to completion before any other render can start. That atomicity
// is why no per-request context (AsyncLocalStorage) is needed. The Scene
// test harness and the client runtime drive a view the same way. A `view`
// that suspended mid-render would break the invariant; views are pure and
// cannot.
const runView = <Model>(
  view: (model: Model, h: HtmlBuilder<any>) => Document,
  model: Model,
): Document => {
  const boundaryRegistry = createBoundaryRegistry()
  beginRender(boundaryRegistry)
  setRuntime(noOpDispatch, Context.empty(), boundaryRegistry)
  try {
    return view(model, htmlBuilderFor())
  } finally {
    clearRuntime()
  }
}

// NOTE: `<` becomes `\u003c` inside the payload so no embedded value can
// form a `</script>` sequence and close the element early. The escape is
// JSON-native, so `JSON.parse` restores the original character during
// hydration.
const escapeJsonForScriptElement = (json: string): string =>
  json.replace(/</g, '\\u003c')

const flagsPayloadScript = (runtimeId: string, json: string): string =>
  `<script type="application/json" ${FOLDKIT_FLAGS_ATTRIBUTE}="${escapeAttributeValue(runtimeId)}">${escapeJsonForScriptElement(json)}</script>`

const encodeFlagsHandoff = <Flags>(
  FlagsCodec: Schema.Codec<Flags, any, never, never>,
  flags: Flags,
  runtimeId: string,
): Effect.Effect<
  Readonly<{ payloadScript: string; hydrationFlags: Flags }>,
  ServerFlagsEncodeError
> =>
  Effect.gen(function* () {
    const FlagsJsonCodec = Schema.toCodecJson(FlagsCodec)
    const encodedFlags = yield* pipe(
      flags,
      Schema.encodeEffect(FlagsJsonCodec),
      Effect.mapError(cause => new ServerFlagsEncodeError({ cause })),
    )
    const json = yield* Effect.try({
      try: () => JSON.stringify(encodedFlags),
      catch: cause => new ServerFlagsEncodeError({ cause }),
    })
    if (!Predicate.isString(json)) {
      return yield* Effect.fail(
        new ServerFlagsEncodeError({
          cause: new Error(
            'Flags encoded to a value JSON cannot represent, so no payload can be embedded',
          ),
        }),
      )
    }
    // NOTE: the hydrating client calls init with decode(encode(flags)), so
    // the server render must too. A codec whose round trip is not the
    // identity would otherwise serve DOM the client's first render disagrees
    // with on every load.
    const hydrationFlags = yield* pipe(
      encodedFlags,
      Schema.decodeEffect(FlagsJsonCodec),
      Effect.mapError(cause => new ServerFlagsEncodeError({ cause })),
    )
    return {
      payloadScript: flagsPayloadScript(runtimeId, json),
      hydrationFlags,
    }
  })

const parseUrl = (url: string): Effect.Effect<Url, InvalidServerUrl> =>
  Option.match(fromString(url), {
    onNone: () => Effect.fail(new InvalidServerUrl({ url })),
    onSome: Effect.succeed,
  })

const validateHydrationRoot = (
  body: Document['body'],
): Effect.Effect<void, InvalidHydrationRoot> => {
  if (body === null) {
    return Effect.fail(new InvalidHydrationRoot({ rootKind: 'Empty' }))
  }

  if (body.sel === undefined || body.sel === '') {
    return Effect.fail(new InvalidHydrationRoot({ rootKind: 'Text' }))
  }

  if (body.sel === '!') {
    return Effect.fail(new InvalidHydrationRoot({ rootKind: 'Comment' }))
  }

  return Effect.void
}

/**
 * Renders a `makeApplication`-shaped config to an HTML string on the server.
 *
 * Resolves `init` for the request (with the given Flags and URL when the
 * config declares them), runs the pure `view` under a no-op dispatch frame,
 * and serializes the resulting `Document` body. The root element is stamped
 * with {@link FOLDKIT_APP_ATTRIBUTE} and, when the config declares `Flags`,
 * the Schema-encoded Flags ride along in a JSON script tag so a hydrating
 * client boots from the same Model.
 *
 * Commands returned by `init` are not run: the rendered HTML is the
 * post-`init` state, and the client runs those Commands after hydration.
 *
 * A hydratable Flags render calls `init` with the encode-then-decode round
 * trip of the given Flags, the exact value the hydrating client will
 * reconstruct, so the served DOM and the client's first render agree by
 * construction even for codecs whose round trip is not the identity.
 *
 * @example
 * ```typescript
 * const renderedApplication = yield* Server.renderToString(config, {
 *   url: request.url,
 *   flags: { theme },
 * })
 * ```
 *
 * @experimental Ships from `foldkit/experimental/server`; expect breaking changes while the API settles.
 */
export function renderToString<Model, Flags>(
  config: ServerRoutingApplicationConfigWithFlags<Model, Flags>,
  options: RenderUrlFlagsOptions<Flags>,
): Effect.Effect<RenderedApplication, ServerRenderError>
export function renderToString<Model>(
  config: ServerRoutingApplicationConfig<Model>,
  options: RenderUrlOptions,
): Effect.Effect<RenderedApplication, ServerRenderError>
export function renderToString<Model, Flags>(
  config: ServerApplicationConfigWithFlags<Model, Flags>,
  options: RenderFlagsOptions<Flags>,
): Effect.Effect<RenderedApplication, ServerRenderError>
export function renderToString<Model>(
  config: ServerApplicationConfig<Model>,
  options?: RenderOptions,
): Effect.Effect<RenderedApplication, ServerRenderError>
export function renderToString(
  config: Readonly<{
    Flags?: Schema.Codec<unknown, any, never, never>
    routing?: unknown
    init: (...initArguments: ReadonlyArray<any>) => InitReturn<unknown>
    view: (model: any, h: HtmlBuilder<any>) => Document
  }>,
  options?: RenderOptions &
    Readonly<{
      url?: string
      flags?: unknown
    }>,
): Effect.Effect<RenderedApplication, ServerRenderError> {
  return Effect.gen(function* () {
    const runtimeId = options?.runtimeId ?? DEFAULT_RUNTIME_ID
    if (runtimeId === '') {
      return yield* Effect.fail(
        new InvalidRuntimeId({
          runtimeId,
        }),
      )
    }
    const hasRouting = config.routing !== undefined
    const FlagsCodec = config.Flags
    const isHydratable = options?.isHydratable ?? true

    const url = hasRouting ? yield* parseUrl(options?.url ?? '') : undefined

    const flagsHandoff =
      isHydratable && FlagsCodec !== undefined
        ? yield* encodeFlagsHandoff(FlagsCodec, options?.flags, runtimeId)
        : undefined
    const flagsForInit =
      flagsHandoff !== undefined ? flagsHandoff.hydrationFlags : options?.flags

    const initReturn = ((): InitReturn<unknown> => {
      if (FlagsCodec !== undefined) {
        return hasRouting
          ? config.init(flagsForInit, url)
          : config.init(flagsForInit)
      }
      return hasRouting ? config.init(url) : config.init()
    })()
    const [model] = initReturn

    const nextDocument = runView(config.view, model)

    if (isHydratable) {
      yield* validateHydrationRoot(nextDocument.body)
    }

    const rootHtml = yield* Effect.try({
      try: () => {
        const html = serializeHtml(
          nextDocument.body,
          isHydratable
            ? { rootAttributes: { [FOLDKIT_APP_ATTRIBUTE]: runtimeId } }
            : {},
        )
        if (isHydratable && nextDocument.body !== null) {
          assertSingleStampedRoot(html, runtimeId, nextDocument.body)
        }
        return html
      },
      catch: cause => new ServerSerializationError({ cause }),
    })

    const flagsPayload =
      flagsHandoff !== undefined ? flagsHandoff.payloadScript : ''

    return {
      html: `${rootHtml}${flagsPayload}`,
      title: nextDocument.title,
      ...(nextDocument.lang !== undefined ? { lang: nextDocument.lang } : {}),
      ...(nextDocument.dir !== undefined
        ? { dir: textDirectionToAttribute(nextDocument.dir) }
        : {}),
      ...(nextDocument.canonical !== undefined
        ? { canonical: nextDocument.canonical }
        : {}),
      ...(nextDocument.ogUrl !== undefined
        ? { ogUrl: nextDocument.ogUrl }
        : {}),
    }
  })
}
