import {
  Effect,
  Layer,
  Match as M,
  Number,
  Option,
  String as String_,
} from 'effect'
import { FileSystem } from 'effect'
import {
  HttpServer,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
  HttpStaticServer,
} from 'effect/unstable/http'
import { Server } from 'foldkit/experimental'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  NodeHttpPlatform,
  NodeHttpServer,
  NodeRuntime,
  NodeServices,
} from '@effect/platform-node'

import { renderPage } from '../src/entry.server'

const EXAMPLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CLIENT_DIR = resolve(EXAMPLE_DIR, 'dist/client')
const DEFAULT_PORT = 3000
const PORT = Option.fromNullishOr(process.env['PORT']).pipe(
  Option.flatMap(Number.parse),
  Option.getOrElse(() => DEFAULT_PORT),
)

const acceptsHtml = (request: HttpServerRequest.HttpServerRequest): boolean =>
  String_.includes('text/html')(request.headers['accept'] ?? '')

const isTemplateRequest = (
  request: HttpServerRequest.HttpServerRequest,
): boolean => {
  const { pathname } = new URL(request.url, 'http://localhost')
  return pathname === '/' || pathname === '/index.html'
}

const renderRequest = (
  request: HttpServerRequest.HttpServerRequest,
  template: string,
) =>
  Effect.gen(function* () {
    const webRequest = yield* HttpServerRequest.toWeb(request)
    const result = yield* Effect.promise(() => renderPage(webRequest))
    return HttpServerResponse.fromWeb(Server.toResponse(template, result))
  })

const isRouteNotFound = (error: HttpServerError.HttpServerError): boolean =>
  error.reason._tag === 'RouteNotFound'

type RequestKind = 'Application' | 'StaticFile'

// NOTE: `/` and `/index.html` are application requests even though a file
// exists for them: the file on disk is the unfilled template, and serving it
// raw would hand the browser an unstamped shell that Runtime.hydrate
// refuses.
const requestKind = (
  request: HttpServerRequest.HttpServerRequest,
): RequestKind => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return 'Application'
  }
  if (isTemplateRequest(request)) {
    return 'Application'
  }
  return 'StaticFile'
}

const makeHandler = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const template = yield* fs.readFileString(resolve(CLIENT_DIR, 'index.html'))
  const staticFiles = yield* HttpStaticServer.make({
    root: CLIENT_DIR,
    index: undefined,
  })

  // NOTE: a static miss from an HTML-accepting client falls through to the
  // application: deep links to client routes have no file on disk.
  const serveStaticFile = (request: HttpServerRequest.HttpServerRequest) =>
    staticFiles.pipe(
      Effect.catchIf(
        error => isRouteNotFound(error) && acceptsHtml(request),
        () => renderRequest(request, template),
      ),
    )

  return HttpServerRequest.HttpServerRequest.use(request =>
    M.value(requestKind(request)).pipe(
      M.when('Application', () => renderRequest(request, template)),
      M.when('StaticFile', () => serveStaticFile(request)),
      M.exhaustive,
    ),
  )
})

const Main = Layer.unwrap(
  Effect.map(makeHandler, handler => HttpServer.serve(handler)),
).pipe(
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layer(createServer, { port: PORT })),
  Layer.provide(NodeHttpPlatform.layer),
  Layer.provide(NodeServices.layer),
)

NodeRuntime.runMain(Layer.launch(Main))
