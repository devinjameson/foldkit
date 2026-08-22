import { Effect, Layer } from 'effect'
import { HttpServer } from 'effect/unstable/http'
import { createServer } from 'node:http'

import {
  NodeHttpPlatform,
  NodeHttpServer,
  NodeRuntime,
  NodeServices,
} from '@effect/platform-node'

import { PORT, makeHandler } from './handler'

const Main = Layer.unwrap(
  Effect.map(makeHandler, handler => HttpServer.serve(handler)),
).pipe(
  HttpServer.withLogAddress,
  Layer.provide(NodeHttpServer.layerConfig(createServer, { port: PORT })),
  Layer.provide(NodeHttpPlatform.layer),
  Layer.provide(NodeServices.layer),
)

NodeRuntime.runMain(Layer.launch(Main))
