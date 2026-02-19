import { Array, Effect, Option, pipe } from 'effect'
import { Runtime } from 'foldkit'

import { getRoomById, loadSessionFromStorage } from '../../command'
import { AppRoute } from '../../route'
import { Message } from './message'
import { Model, RoomRemoteData } from './model'

export type InitReturn = [Model, ReadonlyArray<Runtime.Command<Message>>]

export const init = (route: AppRoute): InitReturn => {
  const commands = pipe(
    route,
    Option.liftPredicate((route) => route._tag === 'Room'),
    Option.map(({ roomId }) => [
      loadSessionFromStorage(roomId).pipe(Effect.map((message) => message)),
      getRoomById(roomId).pipe(Effect.map((message) => message)),
    ]),
    Array.fromOption,
    Array.flatten,
  )

  return [
    {
      roomRemoteData: RoomRemoteData.Idle(),
      maybeSession: Option.none(),
      userGameText: '',
      charsTyped: 0,
      username: '',
      isRoomIdCopyIndicatorVisible: false,
      exitCountdownSecondsLeft: 0,
    },
    commands,
  ]
}
