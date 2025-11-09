import { Rpc } from '@effect/rpc'
import * as Shared from '@typing-game/shared'
import { Array, Effect, HashMap, Struct, SubscriptionRef } from 'effect'
import { randomUUID } from 'node:crypto'

import * as Rooms from '../roomById.js'

export const joinRoom =
  (roomByIdRef: SubscriptionRef.SubscriptionRef<Shared.RoomById>) =>
  (payload: Rpc.Payload<typeof Shared.joinRoomRpc>) =>
    Effect.gen(function* () {
      const playerId = yield* Effect.sync(() => randomUUID())

      const player: Shared.Player = {
        id: playerId,
        username: payload.username,
      }

      const room = yield* SubscriptionRef.modifyEffect(roomByIdRef, (roomById) =>
        Rooms.getById(roomById, payload.roomId).pipe(
          Effect.map((room) => {
            const updatedRoom = Struct.evolve(room, {
              players: (players) => Array.append(players, player),
            })
            return [updatedRoom, HashMap.set(roomById, payload.roomId, updatedRoom)] as const
          }),
        ),
      )

      return { player, room }
    })
