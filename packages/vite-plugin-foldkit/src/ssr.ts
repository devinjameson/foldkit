import { Array, Effect, Predicate } from 'effect'
import * as Server from 'foldkit/experimental/server'
import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import { Readable } from 'node:stream'
import type { Connect, Plugin, ViteDevServer } from 'vite'

/** Options for serving server-rendered pages from the Vite dev server. */
export type FoldkitSsrOptions = Readonly<{
  /**
   * Module path of the server entry, resolved by Vite (e.g.
   * `'/src/entry.server.ts'`). The module must export a `renderPage`
   * function taking a Web `Request` and returning a
   * `Promise<EntryResult>`.
   */
  serverEntry: string
  /**
   * The `id` of the empty container element in `index.html` the rendered
   * markup replaces. Defaults to `'root'`.
   */
  containerId?: string
  /**
   * The origin the entry sees as `Request.url`, such as
   * `'https://app.example'`. Defaults to the origin the dev server itself
   * resolved from its own configuration.
   *
   * The origin is deployment configuration rather than something a request
   * carries. A client chooses its own `Host` header, and Vite accepts IP
   * literals and (with `allowedHosts`) arbitrary names, so deriving the origin
   * from the request would let the client pick the redirects, canonical URLs,
   * and cookie domains an entry builds from `Request.url`. Set this when the
   * dev server sits behind a proxy or TLS terminator that serves a different
   * public origin.
   */
  origin?: string
}>

const isEntryModule = (
  loadedModule: unknown,
): loadedModule is Server.EntryModule =>
  Predicate.isObject(loadedModule) &&
  Predicate.hasProperty(loadedModule, 'renderPage') &&
  Predicate.isFunction(loadedModule.renderPage)

// The origin the dev server serves, taken from the plugin option when the
// deployment sets one and otherwise from the server's own resolved
// configuration. The request never contributes: `Host` is a value the client
// writes, and Vite accepts IP literals by default and any name at all under
// `allowedHosts`, so a request could otherwise name the origin the entry builds
// redirects and canonical URLs from.
const DEV_SERVER_FALLBACK_ORIGIN = 'http://localhost'

const configuredOrigin = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
): string => {
  if (options.origin !== undefined) {
    return options.origin
  }
  const [resolvedUrl] = server.resolvedUrls?.local ?? []
  if (resolvedUrl !== undefined) {
    // Vite prints these with a trailing slash; `new URL` normalizes either form
    // and `origin` drops the path, so both are safe to read here.
    try {
      return new URL(resolvedUrl).origin
    } catch {
      return DEV_SERVER_FALLBACK_ORIGIN
    }
  }
  const { https, port } = server.config.server
  const scheme = https === undefined ? 'http' : 'https'
  return port === undefined
    ? DEV_SERVER_FALLBACK_ORIGIN
    : `${scheme}://localhost:${port}`
}

const toWebRequest = (
  requestUrl: string,
  nodeRequest: Connect.IncomingMessage,
): Request => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(nodeRequest.headers)) {
    if (Predicate.isString(value)) {
      headers.set(name, value)
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item)
      }
    }
  }

  const method = nodeRequest.method ?? 'GET'
  const requestInit: RequestInit & { duplex?: 'half' } = { headers, method }

  if (method !== 'GET' && method !== 'HEAD') {
    // NOTE: Node and the DOM library declare structurally different
    // ReadableStream interfaces even though Node's `Readable.toWeb` returns
    // the Web stream implementation that `Request` consumes at runtime.
    requestInit.body = Readable.toWeb(nodeRequest) as ReadableStream<Uint8Array>
    requestInit.duplex = 'half'
  }

  return new Request(requestUrl, requestInit)
}

// NOTE: this middleware runs after Vite's own, so a request reaching it is
// not a servable module or asset. It classifies the request the same way a
// production host does, through the shared `foldkit/experimental/server`
// helpers, so development predicts production: a GET or HEAD renders when the
// path resolves to the template or the client accepts HTML (Accept parsed
// with quality values, so `text/html;q=0` is refused); OPTIONS and TRACE are
// left to Vite; other methods reach the entry, which may respond directly.
// A deep route's HTML-or-not decision hinges on the Accept header, so both the
// rendered representation ('RenderVaryAccept') and the refused one
// ('RefusedVaryAccept', a 404) must carry Vary: Accept for shared caches, the
// same as a production host.
type RenderDecision =
  | 'Skip'
  | 'Render'
  | 'RenderNegotiated'
  | 'RefusedNegotiated'
  | 'RefusedPathAsset'
  | 'RefusedDestinationAsset'

const requestTargetOf = (nodeRequest: Connect.IncomingMessage): string =>
  nodeRequest.originalUrl ?? nodeRequest.url ?? '/'

// The request target resolved against the configured origin, or `undefined`
// when it names a different one (an absolute-form target, or a network-path
// reference such as `//elsewhere.example/page`). The dev host refuses those
// rather than handing the entry an origin the client chose, which is what a
// generated production host does too.
const resolvedRequestUrl = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
  nodeRequest: Connect.IncomingMessage,
): string | undefined =>
  Server.resolveRequestUrl(
    requestTargetOf(nodeRequest),
    configuredOrigin(server, options),
  )

const renderDecision = (
  nodeRequest: Connect.IncomingMessage,
  requestUrl: string,
): RenderDecision => {
  const method = nodeRequest.method ?? 'GET'
  if (method === 'GET' || method === 'HEAD') {
    if (Server.resolvesToIndexHtml(requestUrl)) {
      return 'Render'
    }
    // A request Vite did not serve and that names an asset is a miss, not a
    // navigation. Browsers fetch scripts and stylesheets with `Accept: */*`, so
    // without this a stale hashed asset would be answered with the app shell at
    // 200 and read as a blank page instead of the 404 it is.
    const fetchDestination = nodeRequest.headers['sec-fetch-dest']
    const classification = Server.classifyRequest(
      requestUrl,
      Predicate.isString(fetchDestination) ? fetchDestination : undefined,
    )
    if (classification === 'PathAsset') {
      return 'RefusedPathAsset'
    }
    if (classification === 'DestinationAsset') {
      return 'RefusedDestinationAsset'
    }
    const accept = nodeRequest.headers.accept
    return Server.acceptsHtml(Predicate.isString(accept) ? accept : undefined)
      ? 'RenderNegotiated'
      : 'RefusedNegotiated'
  }
  if (method === 'OPTIONS' || method === 'TRACE') {
    return 'Skip'
  }
  return 'Render'
}

const renderRequest = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
  nodeRequest: Connect.IncomingMessage,
  requestUrl: string,
): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const { pathname, search } = new URL(requestUrl)
    const route = `${pathname}${search}`

    const rawTemplate = yield* Effect.promise(() =>
      readFile(resolve(server.config.root, 'index.html'), 'utf-8'),
    )

    // NOTE: the first argument tells Vite where the HTML lives, and Vite
    // resolves the template's relative URLs (such as a `./src/entry.ts`
    // script) against it. The template always lives at the site root, so
    // that argument must stay `/index.html` no matter which route is being
    // rendered. The third argument, named `originalUrl` in Vite's signature,
    // carries the route actually being requested.
    const template = yield* Effect.promise(() =>
      server.transformIndexHtml('/index.html', rawTemplate, route),
    )

    const loadedModule = yield* Effect.promise(() =>
      server.ssrLoadModule(options.serverEntry),
    )

    if (!isEntryModule(loadedModule)) {
      return yield* Effect.die(
        new Error(
          `[foldkit] '${options.serverEntry}' does not export a renderPage function, so the dev server cannot render pages.`,
        ),
      )
    }

    const result = yield* Effect.promise(() =>
      loadedModule.renderPage(toWebRequest(requestUrl, nodeRequest)),
    )

    return Server.toResponse(
      template,
      result,
      options.containerId === undefined
        ? {}
        : { containerId: options.containerId },
    )
  })

const varyHeaderValue = (
  value: string | number | Array<string> | undefined,
): string | undefined => {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'string') {
    return value
  }
  return undefined
}

// NOTE: every outcome a static miss negotiates declares both headers the
// negotiation read. Declaring only Accept would let a shared cache store the
// rendered page from a document request and serve it to a later script request
// carrying the same Accept, which never reaches the asset classification, and
// the reverse for the 404.
const setNegotiatedVary = (nodeResponse: ServerResponse): void => {
  const existing = varyHeaderValue(nodeResponse.getHeader('vary'))
  nodeResponse.setHeader(
    'vary',
    Server.varyWith(Server.varyWithAccept(existing), 'Sec-Fetch-Dest'),
  )
}

const sendWebResponse = async (
  webResponse: Response,
  nodeRequest: Connect.IncomingMessage,
  nodeResponse: ServerResponse,
  isNegotiated: boolean,
): Promise<void> => {
  nodeResponse.statusCode = webResponse.status
  if (webResponse.statusText !== '') {
    nodeResponse.statusMessage = webResponse.statusText
  }

  const getSetCookie = Predicate.hasProperty(
    webResponse.headers,
    'getSetCookie',
  )
    ? webResponse.headers.getSetCookie
    : undefined

  const setCookieHeaders = Predicate.isFunction(getSetCookie)
    ? getSetCookie.call(webResponse.headers)
    : []

  for (const [name, value] of webResponse.headers) {
    if (name !== 'set-cookie' || Array.isArrayEmpty(setCookieHeaders)) {
      nodeResponse.setHeader(name, value)
    }
  }

  if (Array.isArrayNonEmpty(setCookieHeaders)) {
    nodeResponse.setHeader('set-cookie', setCookieHeaders)
  }

  if (isNegotiated) {
    // Merge into whatever Vary already sits on the node response (the app's
    // own, plus Vite's own Vary: Origin), so declaring these does not drop it.
    setNegotiatedVary(nodeResponse)
  }

  if (nodeRequest.method === 'HEAD' || webResponse.body === null) {
    nodeResponse.end()
  } else {
    const body = new Uint8Array(await webResponse.arrayBuffer())
    nodeResponse.end(body)
  }
}

/**
 * Serves server-rendered pages from the Vite dev server.
 *
 * Registered after Vite's own middleware, so the client entry, HMR, and
 * assets are untouched. HTML navigations that fall through, plus non-GET
 * requests, load the server entry through Vite's SSR module loader, call its
 * `renderPage` with a Web `Request`, and send the resulting Web `Response`.
 * Server entry edits take effect without a restart.
 */
export const foldkitSsr = (options: FoldkitSsrOptions): Plugin => ({
  name: 'foldkit-ssr',
  // NOTE: `vite preview` also resolves with command 'serve', but it serves
  // built output and never runs configureServer, so applying there would
  // only set appType 'custom' and strip preview's HTML middleware.
  apply: (_config, env) => env.command === 'serve' && env.isPreview !== true,
  config: () => ({ appType: 'custom' }),
  configureServer: server => () => {
    server.middlewares.use(
      (
        nodeRequest: Connect.IncomingMessage,
        nodeResponse: ServerResponse,
        next: Connect.NextFunction,
      ) => {
        const requestUrl = resolvedRequestUrl(server, options, nodeRequest)
        if (requestUrl === undefined) {
          // The target names an origin other than the one being served, so
          // there is no request to render: answering it would hand the entry a
          // client-chosen origin to build redirects and canonical URLs from.
          nodeResponse.statusCode = 400
          nodeResponse.end()
          return
        }
        const decision = renderDecision(nodeRequest, requestUrl)
        if (decision === 'Skip') {
          next()
          return
        }
        if (decision === 'RefusedPathAsset') {
          // The path names an asset whatever the request headers say, so this
          // refusal is the same for every client and needs no Vary.
          nodeResponse.statusCode = 404
          nodeResponse.end()
          return
        }
        if (decision === 'RefusedDestinationAsset') {
          nodeResponse.statusCode = 404
          setNegotiatedVary(nodeResponse)
          nodeResponse.end()
          return
        }
        if (decision === 'RefusedNegotiated') {
          nodeResponse.statusCode = 404
          setNegotiatedVary(nodeResponse)
          nodeResponse.end()
          return
        }
        const isNegotiated = decision === 'RenderNegotiated'
        void Effect.runPromise(
          renderRequest(server, options, nodeRequest, requestUrl),
        )
          .then(response =>
            sendWebResponse(response, nodeRequest, nodeResponse, isNegotiated),
          )
          .catch((error: unknown) => {
            if (error instanceof Error) {
              server.ssrFixStacktrace(error)
            }
            next(error)
          })
      },
    )
  },
})
