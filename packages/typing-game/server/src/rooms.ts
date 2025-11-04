import * as Shared from '@typing-game/shared'
import { Effect, HashMap } from 'effect'

export const getById = (roomById: Shared.RoomById, id: string) =>
  HashMap.get(roomById, id).pipe(
    Effect.mapError(() => new Shared.RoomNotFoundError({ roomId: id })),
  )
