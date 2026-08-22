import { Effect, Layer } from 'effect'
import { HttpServer } from 'effect/unstable/http'

import { DenoHttpServer, DenoRuntime } from '@effect/platform-deno'

import { PORT, makeHandler } from './handler'

// NOTE: `DenoHttpServer.layerConfig` wraps `ServeOptions` in `Config.Wrap`, but
// `ServeOptions` is a union (TCP or Unix socket options) and `Config.Wrap`
// doesn't distribute over it, so the `port` field's type collapses to
// `Config<any>` and rejects a plain number. Resolving PORT ourselves and
// calling the unwrapped `DenoHttpServer.layer` sidesteps that.
const DenoHttpServerLive = Layer.unwrap(
  Effect.map(PORT, port => DenoHttpServer.layer({ port })),
)

const Main = Layer.unwrap(
  Effect.map(makeHandler, handler => HttpServer.serve(handler)),
).pipe(HttpServer.withLogAddress, Layer.provide(DenoHttpServerLive))

DenoRuntime.runMain(Layer.launch(Main))
