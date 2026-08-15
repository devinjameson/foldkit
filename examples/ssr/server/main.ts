import { Config, Effect, Layer, Match as M, String as String_ } from 'effect'
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
import { dirname, posix, resolve } from 'node:path'
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

// NOTE: wildcard and absent Accept headers count as HTML-accepting, so a
// static miss from fetch defaults (*/*), curl, and health checks renders
// the application, matching the dev host.
const acceptsHtml = (request: HttpServerRequest.HttpServerRequest): boolean => {
  const accept = request.headers['accept']
  if (accept === undefined) {
    return true
  }
  return (
    String_.includes('text/html')(accept) || String_.includes('*/*')(accept)
  )
}

// NOTE: the static file server percent-decodes and path-normalizes before
// resolving a file, so the template guard resolves the request the same way.
// Comparing the raw pathname lets /%2findex.html, /%69ndex.html, /INDEX.HTML,
// and /foo/../index.html slip past and serve the raw unfilled template that
// Runtime.hydrate refuses. Backslashes and repeated slashes are collapsed and
// dot segments resolved before the comparison; an undecodable or null-byte
// path is treated as non-template and left to the static server to reject.
const resolvesToTemplate = (
  request: HttpServerRequest.HttpServerRequest,
): boolean => {
  const { pathname } = new URL(request.url, 'http://localhost')
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return false
  }
  if (decoded.includes('\0')) {
    return false
  }
  const collapsed = decoded.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  const normalized = posix.normalize(collapsed)
  const relative = normalized.startsWith('/') ? normalized.slice(1) : normalized
  return relative === '' || relative.toLowerCase() === 'index.html'
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
  if (resolvesToTemplate(request)) {
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
  Layer.provide(
    NodeHttpServer.layerConfig(createServer, {
      port: Config.withDefault(Config.port('PORT'), DEFAULT_PORT),
    }),
  ),
  Layer.provide(NodeHttpPlatform.layer),
  Layer.provide(NodeServices.layer),
)

NodeRuntime.runMain(Layer.launch(Main))
