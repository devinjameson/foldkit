import { Effect } from 'effect'
import { Runtime } from 'foldkit'

import { RoomsClient } from '../../rpc'
import { CreatedRoom, RoomError } from './message'

export const createRoom = (
  username: string,
): Runtime.Command<typeof CreatedRoom | typeof RoomError> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const { player, room } = yield* client.createRoom({ username })
    return CreatedRoom({ roomId: room.id, player })
  }).pipe(
    Effect.catchAll((error) => Effect.succeed(RoomError({ error: String(error) }))),
    Effect.provide(RoomsClient.Default),
  )
