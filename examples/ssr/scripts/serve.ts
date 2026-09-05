import { Config, Effect, Layer, Match, Option } from 'effect'
import {
  HttpServer,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
  HttpStaticServer,
} from 'effect/unstable/http'
import * as Server from 'foldkit/experimental/server'
import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  NodeHttpPlatform,
  NodeHttpServer,
  NodeRuntime,
  NodeServices,
} from '@effect/platform-node'

type FetchHandler = {
  readonly fetch: (request: Request) => Promise<Response>
}

const EXAMPLE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CLIENT_DIR = resolve(EXAMPLE_DIR, 'dist/client')
const FETCH_MODULE_URL = new URL('../dist/server/fetch.js', import.meta.url)
  .href
const DEFAULT_PORT = 3000

const PORT = Config.withDefault(Config.port('PORT'), DEFAULT_PORT)

// NOTE: the origin this deployment serves. A client may send an absolute-form
// target or a network-path reference such as `//elsewhere.example/page`.
// Deriving the origin from the request would let the client choose redirects
// and cookie domains, so a target that resolves anywhere else is refused
// before static files or fetch. Set ORIGIN when deploying behind a proxy or
// TLS terminator.
const ORIGIN = Config.option(Config.string('ORIGIN')).pipe(
  Config.map(Option.filter(origin => origin !== '')),
)

const isFetchHandler = (value: unknown): value is FetchHandler => {
  if (typeof value !== 'object' || value === null || !('fetch' in value)) {
    return false
  }
  return typeof value.fetch === 'function'
}

const isFetchModule = (
  value: unknown,
): value is { readonly default: FetchHandler } => {
  if (typeof value !== 'object' || value === null || !('default' in value)) {
    return false
  }
  return isFetchHandler(value.default)
}

const isRouteNotFound = (error: HttpServerError.HttpServerError): boolean =>
  error.reason._tag === 'RouteNotFound'

const hostSettledResponse = () =>
  HttpServerResponse.setHeader(
    HttpServerResponse.empty({
      status: Server.HOST_METHOD_ANSWERS.refusedStatus,
    }),
    'allow',
    Server.HOST_METHOD_ANSWERS.allow,
  )

const fetchResponse = (
  app: FetchHandler,
  request: HttpServerRequest.HttpServerRequest,
  requestUrl: string,
) =>
  Effect.gen(function* () {
    const webRequest = yield* HttpServerRequest.toWeb(request)
    const response = yield* Effect.promise(() =>
      app.fetch(new Request(requestUrl, webRequest)),
    )
    return HttpServerResponse.fromWeb(response)
  })

const loadFetchHandler = (origin: string) =>
  Effect.gen(function* () {
    // The fetch bundle reads `process.env.ORIGIN` at module evaluation. Set it
    // before the import so the handler locks to the same origin this host
    // uses for `resolveRequestUrl`.
    if (process.env['ORIGIN'] === undefined || process.env['ORIGIN'] === '') {
      process.env['ORIGIN'] = origin
    }
    const loaded: unknown = yield* Effect.promise(
      () => import(FETCH_MODULE_URL),
    )
    if (!isFetchModule(loaded)) {
      return yield* Effect.die(
        new Error(
          'dist/server/fetch.js must default-export a Web fetch handler',
        ),
      )
    }
    return loaded.default
  })

const makeHandler = Effect.gen(function* () {
  const port = yield* PORT
  const origin = Option.getOrElse(
    yield* ORIGIN,
    () => `http://localhost:${String(port)}`,
  )
  const app = yield* loadFetchHandler(origin)
  // `index` is unset so a directory request does not serve the raw client
  // `index.html` template. Page requests go through `fetch` instead.
  const staticFiles = yield* HttpStaticServer.make({
    root: CLIENT_DIR,
    index: undefined,
  })

  return HttpServerRequest.HttpServerRequest.use(request => {
    // NOTE: refuse an off-origin target before looking for a file. A
    // network-path request such as `//evil.example/../assets/app.js` names
    // another host, then a path that exists on disk.
    const requestUrl = Server.resolveRequestUrl(request.url, origin)
    if (requestUrl === undefined) {
      return Effect.succeed(HttpServerResponse.empty({ status: 400 }))
    }
    const resolved = new URL(requestUrl)
    const normalizedRequest = request.modify({
      url: `${resolved.pathname}${resolved.search}`,
    })
    const response = Match.value(normalizedRequest.method).pipe(
      Match.whenOr('GET', 'HEAD', () => {
        if (Server.resolvesToIndexHtml(requestUrl)) {
          return fetchResponse(app, normalizedRequest, requestUrl)
        }
        return staticFiles.pipe(
          Effect.catchIf(isRouteNotFound, () =>
            fetchResponse(app, normalizedRequest, requestUrl),
          ),
        )
      }),
      Match.orElse(() => {
        if (Server.isHostSettledMethod(normalizedRequest.method)) {
          return Effect.succeed(hostSettledResponse())
        }
        return fetchResponse(app, normalizedRequest, requestUrl)
      }),
    )
    return Effect.provideService(
      response,
      HttpServerRequest.HttpServerRequest,
      normalizedRequest,
    )
  })
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
