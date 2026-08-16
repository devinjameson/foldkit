import { Config, Effect, FileSystem, Layer, Match as M, Option } from 'effect'
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

const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const CLIENT_DIR = resolve(PROJECT_DIR, 'dist/client')
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

// NOTE: Vary: Accept keeps a shared cache from serving one client's
// representation to another when a static miss is answered by content
// negotiation. It is merged with any Vary the render already set, parsing
// Vary as field-name tokens so Accept-Language or Accept-Encoding is never
// mistaken for the Accept field.
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
const requestKind = ({
  method,
  url,
}: HttpServerRequest.HttpServerRequest): RequestKind => {
  if (method === 'GET' || method === 'HEAD') {
    return Server.resolvesToIndexHtml(url) ? 'Render' : 'StaticOrRender'
  } else if (method === 'OPTIONS' || method === 'TRACE') {
    return 'MethodNotAllowed'
  } else {
    return 'Render'
  }
}

const makeHandler = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const template = yield* fs.readFileString(resolve(CLIENT_DIR, 'index.html'))
  const staticFiles = yield* HttpStaticServer.make({
    root: CLIENT_DIR,
    index: undefined,
  })

  // NOTE: a static miss is Accept-negotiated because a deep link into a client
  // route has no file on disk but an HTML client should still get the app
  // shell. It renders, anything else 404s, and both carry Vary: Accept.
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
