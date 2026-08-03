import { Array, Effect, Predicate } from 'effect'
import {
  type ServerEntryModule,
  injectIntoTemplate,
} from 'foldkit/experimental/server'
import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { Connect, Plugin, ViteDevServer } from 'vite'

/** Options for serving server-rendered pages from the Vite dev server. */
export type FoldkitSsrOptions = Readonly<{
  /**
   * Module path of the server entry, resolved by Vite (e.g.
   * `'/src/entry.server.ts'`). The module must export a `renderPage`
   * function taking a `Request` and returning a
   * `Promise<RenderedApplication>`.
   */
  serverEntry: string
  /**
   * The `id` of the empty container element in `index.html` the rendered
   * markup replaces. Defaults to `'root'`.
   */
  containerId?: string
}>

const isServerEntryModule = (
  loadedModule: unknown,
): loadedModule is ServerEntryModule =>
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
  return new Request(new URL(url, `http://${host}`), { headers })
}

const shouldRenderPage = (nodeRequest: Connect.IncomingMessage): boolean =>
  nodeRequest.method === 'GET'

const renderRequest = (
  server: ViteDevServer,
  options: FoldkitSsrOptions,
  nodeRequest: Connect.IncomingMessage,
): Effect.Effect<string> =>
  Effect.gen(function* () {
    const url = nodeRequest.originalUrl ?? nodeRequest.url ?? '/'
    const rawTemplate = yield* Effect.promise(() =>
      readFile(resolve(server.config.root, 'index.html'), 'utf-8'),
    )
    const template = yield* Effect.promise(() =>
      server.transformIndexHtml(url, rawTemplate),
    )
    const loadedModule = yield* Effect.promise(() =>
      server.ssrLoadModule(options.serverEntry),
    )
    if (!isServerEntryModule(loadedModule)) {
      return yield* Effect.die(
        new Error(
          `[foldkit] '${options.serverEntry}' does not export a renderPage function, so the dev server cannot render pages.`,
        ),
      )
    }
    const rendered = yield* Effect.promise(() =>
      loadedModule.renderPage(toWebRequest(url, nodeRequest)),
    )
    return injectIntoTemplate(
      template,
      rendered,
      options.containerId === undefined
        ? {}
        : { containerId: options.containerId },
    )
  })

/**
 * Serves server-rendered pages from the Vite dev server.
 *
 * Registered after Vite's own middleware, so the client entry, HMR, and
 * assets are untouched; a GET request that falls through is rendered. Each
 * render loads the server entry through Vite's SSR module loader (picking up
 * edits without a restart), calls its `renderPage` with the request, and
 * places the result into the transformed `index.html` via
 * `injectIntoTemplate`.
 */
export const foldkitSsr = (options: FoldkitSsrOptions): Plugin => ({
  name: 'foldkit-ssr',
  apply: 'serve',
  config: () => ({ appType: 'custom' }),
  configureServer: server => () => {
    server.middlewares.use(
      (
        nodeRequest: Connect.IncomingMessage,
        nodeResponse: ServerResponse,
        next: Connect.NextFunction,
      ) => {
        if (!shouldRenderPage(nodeRequest)) {
          next()
          return
        }
        void Effect.runPromise(
          renderRequest(server, options, nodeRequest),
        ).then(
          page => {
            nodeResponse.setHeader('content-type', 'text/html')
            nodeResponse.end(page)
          },
          (error: unknown) => {
            if (error instanceof Error) {
              server.ssrFixStacktrace(error)
            }
            next(error)
          },
        )
      },
    )
  },
})
