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

const PORT = Config.withDefault(Config.port('PORT'), DEFAULT_PORT)

// NOTE: the origin this deployment serves, which the entry sees as
// `Request.url`. It is configuration, not something a request carries: a client
// may send an absolute-form target, or a network-path reference such as
// `//elsewhere.example/page`, and a `Host` header naming any site at all.
// Deriving the origin from the request would let the client choose the
// redirects, canonical URLs, and cookie domains the entry builds from it, so a
// target that resolves anywhere but this origin is refused before it reaches
// renderPage. Set ORIGIN to the public origin when deploying behind a proxy or
// TLS terminator.
const ORIGIN = Config.option(Config.string('ORIGIN'))

const renderRequest = (
  request: HttpServerRequest.HttpServerRequest,
  template: string,
  origin: string,
) =>
  Effect.gen(function* () {
    const requestUrl = Server.resolveRequestUrl(request.url, origin)
    if (requestUrl === undefined) {
      return HttpServerResponse.empty({ status: 400 })
    }
    const webRequest = yield* HttpServerRequest.toWeb(request)
    const result = yield* Effect.promise(() =>
      renderPage(new Request(requestUrl, webRequest)),
    )
    return HttpServerResponse.fromWeb(Server.toResponse(template, result))
  })

// NOTE: every outcome a static miss negotiates declares both headers the
// negotiation read. The same extensionless URL answers 404 to a script request
// and HTML to a navigation, so declaring only one would let a shared cache
// serve either response to the other kind of request.
const withNegotiatedVary = (
  response: HttpServerResponse.HttpServerResponse,
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.setHeader(
    response,
    'vary',
    Server.varyWith(
      Server.varyWithAccept(
        Option.getOrUndefined(HttpHeaders.get('vary')(response.headers)),
      ),
      'Sec-Fetch-Dest',
    ),
  )

const isRouteNotFound = (error: HttpServerError.HttpServerError): boolean =>
  error.reason._tag === 'RouteNotFound'

type RequestKind = 'Render' | 'StaticOrRender' | 'MethodNotAllowed'

// NOTE: `/` and `/index.html` (and the encoded paths that resolve to them)
// are application requests even though a file exists for them: the file on
// disk is the unfilled template, and serving it raw would hand the browser an
// unstamped shell that Runtime.hydrate refuses. Only GET and HEAD render; every
// other method (OPTIONS, POST, ...) is refused with 405 rather than rendered.
const requestKind = ({
  method,
  url,
}: HttpServerRequest.HttpServerRequest): RequestKind =>
  M.value(method).pipe(
    M.withReturnType<RequestKind>(),
    M.whenOr('GET', 'HEAD', () =>
      Server.resolvesToIndexHtml(url) ? 'Render' : 'StaticOrRender',
    ),
    M.orElse(() => 'MethodNotAllowed'),
  )

const makeHandler = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const port = yield* PORT
  const origin = Option.getOrElse(
    yield* ORIGIN,
    () => `http://localhost:${port}`,
  )
  const template = yield* fs.readFileString(resolve(CLIENT_DIR, 'index.html'))
  const staticFiles = yield* HttpStaticServer.make({
    root: CLIENT_DIR,
    index: undefined,
  })

  // NOTE: a static miss is Accept-negotiated because a deep link into a client
  // route has no file on disk but an HTML client should still get the app
  // shell. It renders, anything else 404s, and both carry Vary: Accept. A miss
  // that names an asset never renders: browsers fetch scripts and stylesheets
  // with `Accept: */*`, so a hashed asset from a previous deployment would
  // otherwise be answered with the app shell at 200 and read as a blank page
  // rather than the 404 it is. That refusal does not depend on Accept, so it
  // carries no Vary.
  const serveStaticOrRender = (request: HttpServerRequest.HttpServerRequest) =>
    staticFiles.pipe(
      Effect.catchIf(isRouteNotFound, () =>
        M.value(
          Server.classifyRequest(
            request.url,
            request.headers['sec-fetch-dest'],
          ),
        ).pipe(
          M.when('PathAsset', () =>
            Effect.succeed(HttpServerResponse.empty({ status: 404 })),
          ),
          M.when('DestinationAsset', () =>
            Effect.succeed(
              withNegotiatedVary(HttpServerResponse.empty({ status: 404 })),
            ),
          ),
          M.when('Page', () =>
            Server.acceptsHtml(request.headers['accept'])
              ? renderRequest(request, template, origin).pipe(
                  Effect.map(withNegotiatedVary),
                )
              : Effect.succeed(
                  withNegotiatedVary(HttpServerResponse.empty({ status: 404 })),
                ),
          ),
          M.exhaustive,
        ),
      ),
    )

  return HttpServerRequest.HttpServerRequest.use(request =>
    M.value(requestKind(request)).pipe(
      M.when('Render', () => renderRequest(request, template, origin)),
      M.when('StaticOrRender', () => serveStaticOrRender(request)),
      M.when('MethodNotAllowed', () =>
        Effect.succeed(
          HttpServerResponse.setHeader(
            HttpServerResponse.empty({ status: 405 }),
            'allow',
            'GET, HEAD',
          ),
        ),
      ),
      M.exhaustive,
    ),
  )
})

const Main = Layer.unwrap(
  Effect.map(makeHandler, handler => HttpServer.serve(handler)),
).pipe(
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layerConfig(createServer, { port: PORT })),
  Layer.provide(NodeHttpPlatform.layer),
  Layer.provide(NodeServices.layer),
)

NodeRuntime.runMain(Layer.launch(Main))
