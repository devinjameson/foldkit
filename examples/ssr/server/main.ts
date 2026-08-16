import { Config, Effect, Layer, Match as M, Option } from 'effect'
import { FileSystem } from 'effect'
import {
  Headers as HttpHeaders,
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

const renderRequest = (
  request: HttpServerRequest.HttpServerRequest,
  template: string,
) =>
  Effect.gen(function* () {
    const webRequest = yield* HttpServerRequest.toWeb(request)
    const result = yield* Effect.promise(() => renderPage(webRequest))
    return HttpServerResponse.fromWeb(Server.toResponse(template, result))
  })

// A static miss is answered by content negotiation, so the representation
// depends on the Accept header. Vary: Accept keeps a shared cache from
// serving one client's representation to another, merged with any Vary the
// render already set (the example varies on Cookie for its counter). The merge
// parses Vary as field-name tokens so Accept-Language or Accept-Encoding is
// never mistaken for the Accept field.
const withVaryAccept = (
  response: HttpServerResponse.HttpServerResponse,
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.setHeader(
    response,
    'vary',
    Server.varyWithAccept(
      Option.getOrUndefined(HttpHeaders.get('vary')(response.headers)),
    ),
  )

const isRouteNotFound = (error: HttpServerError.HttpServerError): boolean =>
  error.reason._tag === 'RouteNotFound'

type RequestKind = 'Render' | 'StaticOrRender' | 'MethodNotAllowed'

// NOTE: `/` and `/index.html` (and the encoded paths that resolve to them)
// are application requests even though a file exists for them: the file on
// disk is the unfilled template, and serving it raw would hand the browser an
// unstamped shell that Runtime.hydrate refuses. OPTIONS and other non-page
// methods are not rendered.
const requestKind = (
  request: HttpServerRequest.HttpServerRequest,
): RequestKind => {
  const method = request.method
  if (method === 'GET' || method === 'HEAD') {
    return Server.resolvesToIndexHtml(request.url) ? 'Render' : 'StaticOrRender'
  }
  if (method === 'OPTIONS' || method === 'TRACE') {
    return 'MethodNotAllowed'
  }
  return 'Render'
}

const makeHandler = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const template = yield* fs.readFileString(resolve(CLIENT_DIR, 'index.html'))
  const staticFiles = yield* HttpStaticServer.make({
    root: CLIENT_DIR,
    index: undefined,
  })

  // A GET/HEAD miss is Accept-negotiated: an HTML-accepting client (a deep
  // link into a client route, a browser, curl, a health check) renders the
  // application; anything else gets a 404. Both carry Vary: Accept.
  const serveStaticOrRender = (request: HttpServerRequest.HttpServerRequest) =>
    staticFiles.pipe(
      Effect.catchIf(isRouteNotFound, () =>
        Server.acceptsHtml(request.headers['accept'])
          ? renderRequest(request, template).pipe(Effect.map(withVaryAccept))
          : Effect.succeed(
              withVaryAccept(HttpServerResponse.empty({ status: 404 })),
            ),
      ),
    )

  return HttpServerRequest.HttpServerRequest.use(request =>
    M.value(requestKind(request)).pipe(
      M.when('Render', () => renderRequest(request, template)),
      M.when('StaticOrRender', () => serveStaticOrRender(request)),
      M.when('MethodNotAllowed', () =>
        Effect.succeed(HttpServerResponse.empty({ status: 405 })),
      ),
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
