import {
  Config,
  Effect,
  FileSystem,
  Layer,
  Match as M,
  String as String_,
} from 'effect'
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

const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CLIENT_DIR = resolve(PROJECT_DIR, 'dist/client')
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

const decodedPathname = (pathname: string): string => {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname
  }
}

// NOTE: the static file server percent-decodes paths before resolving them,
// so the template guard decodes and lowercases the same way; otherwise
// /%69ndex.html or /INDEX.HTML slips past it and the raw unfilled template
// is served as a static file.
const isTemplateRequest = (
  request: HttpServerRequest.HttpServerRequest,
): boolean => {
  const { pathname } = new URL(request.url, 'http://localhost')
  const normalizedPathname = decodedPathname(pathname).toLowerCase()
  return normalizedPathname === '/' || normalizedPathname === '/index.html'
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
  Layer.provide(
    NodeHttpServer.layerConfig(createServer, {
      port: Config.withDefault(Config.port('PORT'), DEFAULT_PORT),
    }),
  ),
  Layer.provide(NodeHttpPlatform.layer),
  Layer.provide(NodeServices.layer),
)

NodeRuntime.runMain(Layer.launch(Main))
