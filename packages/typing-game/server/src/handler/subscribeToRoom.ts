import { Rpc } from '@effect/rpc'
import * as Shared from '@typing-game/shared'
import { Duration, Effect, HashMap, Option, Stream, SubscriptionRef } from 'effect'

import { ROOM_UPDATE_THROTTLE_MS } from '../game.js'
import { getPlayerProgress } from '../scoring.js'

type ProgressByGamePlayer = HashMap.HashMap<Shared.GamePlayer, Shared.PlayerProgress>

export const subscribeToRoom =
  (
    roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>,
    progressByGamePlayerRef: SubscriptionRef.SubscriptionRef<ProgressByGamePlayer>,
  ) =>
  (
    payload: Rpc.Payload<typeof Shared.subscribeToRoomRpc>,
  ): Stream.Stream<Shared.RoomWithPlayerProgress, Shared.RoomNotFoundError> =>
    roomByIdRef.changes.pipe(
      Stream.mapEffect((roomById) =>
        Effect.gen(function* () {
          const room = yield* HashMap.get(roomById, payload.roomId).pipe(
            Effect.mapError(() => new Shared.RoomNotFoundError({ roomId: payload.roomId })),
          )

          const maybePlayerProgress = yield* Option.match(room.maybeGame, {
            onSome: (game) => getPlayerProgress(progressByGamePlayerRef, payload.playerId, game.id),
            onNone: () => Effect.succeed(Option.none<Shared.PlayerProgress>()),
          })

          return Shared.RoomWithPlayerProgress.make({ room, maybePlayerProgress })
        }),
      ),
      Stream.throttle({
        cost: () => 1,
        duration: Duration.millis(ROOM_UPDATE_THROTTLE_MS),
        units: 1,
      }),
    )
