import { FetchHttpClient } from '@effect/platform'
import { RpcClient, RpcSerialization } from '@effect/rpc'
import { RoomRpcs } from '@typing-game/shared'
import { Effect, Layer } from 'effect'

const ProtocolLive = RpcClient.layerProtocolHttp({
  url: 'http://localhost:3001/rpc',
}).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]))

export class RoomsClient extends Effect.Service<RoomsClient>()('RoomsClient', {
  scoped: RpcClient.make(RoomRpcs),
  dependencies: [ProtocolLive],
}) {}
