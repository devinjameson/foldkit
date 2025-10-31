import * as Shared from '@typing-game/shared'
import { Effect, HashMap } from 'effect'

export const getById = (rooms: Shared.Rooms, id: string) =>
  HashMap.get(rooms, id).pipe(Effect.mapError(() => new Shared.RoomNotFoundError({ roomId: id })))
