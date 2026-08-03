import { Effect, Layer, String as String_, pipe } from 'effect'
import { FileSystem } from 'effect'
import {
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from 'effect/unstable/http'
import { createServer } from 'node:http'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  NodeHttpServer,
  NodeRuntime,
  NodeServices,
} from '@effect/platform-node'

import type * as EntryServer from '../src/entry.server'
import { injectIntoTemplate } from './page'

const EXAMPLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT_DIR = resolve(EXAMPLE_DIR, 'dist/client')
const SERVER_ENTRY_PATH = resolve(EXAMPLE_DIR, 'dist/server/entry.server.js')
const PORT = Number(process.env['PORT'] ?? 3000)

const loadEntryServer: Effect.Effect<typeof EntryServer> = Effect.promise(
  () => import(pathToFileURL(SERVER_ENTRY_PATH).href),
)

const isAssetPath = (path: string): boolean =>
  String_.includes('.')(path) && !String_.includes('..')(path)

// NOTE: `resolve(CLIENT_DIR, segment)` discards CLIENT_DIR entirely when the
// segment is itself absolute (a request path like `/C:/secrets` slices to a
// Windows-drive-shaped `C:/secrets`), so containment is verified on the
// resolved path rather than trusting the `..` check on the raw request path.
const serveAsset = (path: string) => {
  const resolved = resolve(CLIENT_DIR, path.slice(1))
  const relativePath = relative(CLIENT_DIR, resolved)
  if (relativePath === '' || relativePath.startsWith('..')) {
    return Effect.succeed(HttpServerResponse.empty({ status: 404 }))
  }
  return pipe(
    HttpServerResponse.file(resolved),
    Effect.catch(() =>
      Effect.succeed(HttpServerResponse.empty({ status: 404 })),
    ),
  )
}

const handler = (entryServer: typeof EntryServer, template: string) =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const path = new URL(request.url, 'http://localhost').pathname

    if (isAssetPath(path)) {
      return yield* serveAsset(path)
    }

    const rendered = yield* pipe(
      entryServer.renderPage(request.headers['cookie'] ?? ''),
      Effect.orDie,
    )
    return HttpServerResponse.html(injectIntoTemplate(template, rendered))
  })

const Main = Layer.unwrap(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const entryServer = yield* loadEntryServer
    const template = yield* fs.readFileString(resolve(CLIENT_DIR, 'index.html'))
    return HttpServer.serve(handler(entryServer, template))
  }),
).pipe(
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT })),
  Layer.provide(NodeServices.layer),
)

NodeRuntime.runMain(Layer.launch(Main))
