import { Array, Effect, Predicate } from 'effect'
import { Server } from 'foldkit/experimental'
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
}>

const isEntryModule = (
  loadedModule: unknown,
): loadedModule is Server.EntryModule =>
  Predicate.isObject(loadedModule) &&
  Predicate.hasProperty(loadedModule, 'renderPage') &&
  Predicate.isFunction(loadedModule.renderPage)

const toWebRequest = (
  url: string,
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

  const host = nodeRequest.headers.host ?? 'localhost'
  const method = nodeRequest.method ?? 'GET'
  const requestInit: RequestInit & { duplex?: 'half' } = { headers, method }

  if (method !== 'GET' && method !== 'HEAD') {
    // NOTE: Node and the DOM library declare structurally different
    // ReadableStream interfaces even though Node's `Readable.toWeb` returns
    // the Web stream implementation that `Request` consumes at runtime.
    requestInit.body = Readable.toWeb(nodeRequest) as ReadableStream<Uint8Array>
    requestInit.duplex = 'half'
  }

  return new Request(new URL(url, `http://${host}`), requestInit)
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
  | 'RenderVaryAccept'
  | 'RefusedVaryAccept'

const renderDecision = (
  nodeRequest: Connect.IncomingMessage,
): RenderDecision => {
  const method = nodeRequest.method ?? 'GET'
  const url = nodeRequest.originalUrl ?? nodeRequest.url ?? '/'
  if (method === 'GET' || method === 'HEAD') {
    if (Server.resolvesToIndexHtml(url)) {
      return 'Render'
    }
    const accept = nodeRequest.headers.accept
    return Server.acceptsHtml(Predicate.isString(accept) ? accept : undefined)
      ? 'RenderVaryAccept'
      : 'RefusedVaryAccept'
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
): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const url = nodeRequest.originalUrl ?? nodeRequest.url ?? '/'

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
      server.transformIndexHtml('/index.html', rawTemplate, url),
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
      loadedModule.renderPage(toWebRequest(url, nodeRequest)),
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

const sendWebResponse = async (
  webResponse: Response,
  nodeRequest: Connect.IncomingMessage,
  nodeResponse: ServerResponse,
  varyAccept: boolean,
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

  if (varyAccept) {
    // Merge into whatever Vary already sits on the node response (the app's
    // own, plus Vite's own Vary: Origin), so declaring Accept does not drop it.
    nodeResponse.setHeader(
      'vary',
      Server.varyWithAccept(varyHeaderValue(nodeResponse.getHeader('vary'))),
    )
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
        const decision = renderDecision(nodeRequest)
        if (decision === 'Skip') {
          next()
          return
        }
        if (decision === 'RefusedVaryAccept') {
          // The 404 depends on Accept (an HTML-accepting client would have
          // rendered), so it varies on Accept for a shared cache, the same as
          // a production host's refused response.
          nodeResponse.statusCode = 404
          nodeResponse.setHeader(
            'vary',
            Server.varyWithAccept(
              varyHeaderValue(nodeResponse.getHeader('vary')),
            ),
          )
          nodeResponse.end()
          return
        }
        const varyAccept = decision === 'RenderVaryAccept'
        void Effect.runPromise(renderRequest(server, options, nodeRequest))
          .then(response =>
            sendWebResponse(response, nodeRequest, nodeResponse, varyAccept),
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
