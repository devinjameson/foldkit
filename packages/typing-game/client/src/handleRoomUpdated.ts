import * as Shared from '@typing-game/shared'
import { Array, Data, Function, Option, String as Str } from 'effect'
import { Runtime, Task } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Message, Model, NoOp, RoomUpdated, USER_TEXT_INPUT_ID } from './main'

export const handleRoomUpdated =
  (model: Model) =>
  ({
    room,
    maybePlayerProgress,
  }: RoomUpdated): [Model, ReadonlyArray<Runtime.Command<Message>>] => {
    const hadRoom = Option.isSome(model.maybeRoom)
    const hadStatusPlaying = Option.exists(
      model.maybeRoom,
      ({ status }) => status._tag === 'Playing',
    )
    const isStatusPlaying = room.status._tag === 'Playing'

    const gameJustStarted = hadRoom && !hadStatusPlaying && isStatusPlaying

    const progressAction = determinePlayerProgressAction(
      room,
      model.userText,
      model.charsTyped,
      maybePlayerProgress,
    )

    const nextUserText = gameJustStarted
      ? Str.empty
      : PlayerProgressAction.$match(progressAction, {
          Clear: () => Str.empty,
          Maintain: ({ userText }) => userText,
          Restore: ({ progress: { userText } }) => userText,
        })

    const nextCharsTyped = gameJustStarted
      ? 0
      : PlayerProgressAction.$match(progressAction, {
          Clear: () => 0,
          Maintain: ({ charsTyped }) => charsTyped,
          Restore: ({ progress }) => progress.charsTyped,
        })

    const isFirstRoomUpdate = !hadRoom
    const hasGame = Option.isSome(room.maybeGame)

    const shouldFocus = (gameJustStarted || isFirstRoomUpdate) && hasGame

    const commands = optionWhen(shouldFocus, () => {
      const userTextInputSelector = `#${USER_TEXT_INPUT_ID}`
      return Task.focus(userTextInputSelector, () => NoOp.make())
    })

    return [
      evo(model, {
        maybeRoom: () => Option.some(room),
        userText: () => nextUserText,
        charsTyped: () => nextCharsTyped,
      }),
      Array.getSomes([commands]),
    ]
  }

const optionWhen = <T>(condition: boolean, value: Function.LazyArg<T>): Option.Option<T> => {
  return condition ? Option.some(value()) : Option.none()
}

type PlayerProgressAction = Data.TaggedEnum<{
  Clear: {}
  Maintain: { userText: string; charsTyped: number }
  Restore: { progress: Shared.PlayerProgress }
}>

const PlayerProgressAction = Data.taggedEnum<PlayerProgressAction>()

const determinePlayerProgressAction = (
  room: Shared.Room,
  currentUserText: string,
  currentCharsTyped: number,
  maybePlayerProgress: Option.Option<Shared.PlayerProgress>,
): PlayerProgressAction => {
  if (room.status._tag === 'Finished') {
    return PlayerProgressAction.Clear()
  } else if (Str.isNonEmpty(currentUserText)) {
    return PlayerProgressAction.Maintain({
      userText: currentUserText,
      charsTyped: currentCharsTyped,
    })
  } else {
    return Option.match(maybePlayerProgress, {
      onSome: (progress) => PlayerProgressAction.Restore({ progress }),
      onNone: () => PlayerProgressAction.Clear(),
    })
  }
}
