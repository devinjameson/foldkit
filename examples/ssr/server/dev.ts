import { Console, Effect } from 'effect'
import { FileSystem } from 'effect'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'

import { NodeRuntime, NodeServices } from '@effect/platform-node'

import type * as EntryServer from '../src/entry.server'
import { injectIntoTemplate } from './page'

const EXAMPLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env['PORT'] ?? 3000)

const isEntryServer = (
  loadedModule: unknown,
): loadedModule is typeof EntryServer =>
  typeof loadedModule === 'object' &&
  loadedModule !== null &&
  'renderPage' in loadedModule &&
  typeof loadedModule.renderPage === 'function'

// NOTE: Vite's dev middleware is a connect handler, so the development
// server is a plain node server that gives Vite first crack at every
// request (client entry, HMR, assets). Only requests Vite passes through
// reach the render path. The production server (`server/main.ts`) has no
// Vite in the loop and serves through the Effect HttpServer.
const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const nodeServer = createServer()

  const vite = yield* Effect.acquireRelease(
    Effect.promise(() =>
      createViteServer({
        root: EXAMPLE_DIR,
        server: { middlewareMode: true, hmr: { server: nodeServer } },
        appType: 'custom',
      }),
    ),
    viteServer => Effect.promise(() => viteServer.close()),
  )

  const rawTemplate = yield* fs.readFileString(
    resolve(EXAMPLE_DIR, 'index.html'),
  )

  const renderRequest = (url: string, cookieHeader: string) =>
    Effect.gen(function* () {
      const template = yield* Effect.promise(() =>
        vite.transformIndexHtml(url, rawTemplate),
      )
      const entryServer = yield* Effect.promise(() =>
        vite.ssrLoadModule('/src/entry.server.ts'),
      )
      if (!isEntryServer(entryServer)) {
        return yield* Effect.die(
          new Error(
            "'/src/entry.server.ts' does not export renderPage, so the dev server cannot render pages",
          ),
        )
      }
      const rendered = yield* entryServer.renderPage(cookieHeader)
      return injectIntoTemplate(template, rendered)
    })

  nodeServer.on('request', (request, response) => {
    vite.middlewares(request, response, () => {
      void Effect.runPromise(
        renderRequest(request.url ?? '/', request.headers.cookie ?? '').pipe(
          Effect.map(page => {
            response.writeHead(200, { 'content-type': 'text/html' })
            response.end(page)
          }),
          Effect.catchCause(cause =>
            Effect.sync(() => {
              response.writeHead(500, { 'content-type': 'text/plain' })
              response.end(String(cause))
            }),
          ),
        ),
      )
    })
  })

  yield* Effect.acquireRelease(
    Effect.callback<void, Error>(resume => {
      nodeServer.once('error', (error: Error) => {
        resume(Effect.fail(error))
      })
      nodeServer.listen(PORT, () => {
        resume(Effect.void)
      })
    }),
    () =>
      Effect.callback<void>(resume => {
        nodeServer.close(() => {
          resume(Effect.void)
        })
      }),
  )

  yield* Console.log(`SSR dev server running at http://localhost:${PORT}`)
  yield* Effect.never
})

NodeRuntime.runMain(
  Effect.scoped(program).pipe(Effect.provide(NodeServices.layer)),
)
