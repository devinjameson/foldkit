import * as Shared from '@typing-game/shared'
import { Array, Effect, Match as M, Number, Option, String as Str, pipe } from 'effect'
import { Runtime, Task } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import { clearSession, savePlayerToSessionStorage } from '../../../command'
import { ROOM_PAGE_USERNAME_INPUT_ID } from '../../../constant'
import { optionWhen } from '../../../optionWhen'
import { homeRouter } from '../../../route'
import {
  copyRoomIdToClipboard,
  exitCountdownTick,
  hideRoomIdCopiedIndicator,
  joinRoom,
  startGame,
  updatePlayerProgress,
} from '../command'
import { Message, NoOp } from '../message'
import { Model, RoomRemoteData } from '../model'
import { validateUserTextInput } from '../userGameText'
import { handleRoomUpdated } from './handleRoomUpdates'

export type UpdateReturn = [Model, ReadonlyArray<Runtime.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      NoOp: () => [model, []],

      KeyPressed: handleKeyPressed(model),

      UserTextInputted: ({ value }) => {
        const maybeRoom = M.value(model.roomRemoteData).pipe(
          M.tag('Ok', ({ data }) => data),
          M.option,
        )

        const maybeGameText = pipe(
          maybeRoom,
          Option.flatMap(({ maybeGame }) => maybeGame),
          Option.map(({ text }) => text),
        )

        const userGameText = validateUserTextInput(value, maybeGameText)

        const newCharsTyped = pipe(
          Str.length(userGameText) - Str.length(model.userGameText),
          Number.max(0),
        )
        const nextCharsTyped = model.charsTyped + newCharsTyped

        const commands = pipe(
          Option.all([model.maybeSession, Option.flatMap(maybeRoom, ({ maybeGame }) => maybeGame)]),
          Option.map(([session, game]) =>
            updatePlayerProgress(session.player.id, game.id, userGameText, nextCharsTyped),
          ),
        )

        return [
          evo(model, {
            userGameText: () => userGameText,
            charsTyped: () => nextCharsTyped,
          }),
          Array.fromOption(commands),
        ]
      },

      RoomPageUsernameInputBlurred: () => [
        model,
        [Task.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`, () => NoOp())],
      ],

      RoomPageUsernameInputted: ({ value }) => [
        evo(model, {
          username: () => value,
        }),
        [],
      ],

      JoinRoomFromPageSubmitted: ({ roomId }) => {
        const maybeJoinRoom = optionWhen(Str.isNonEmpty(model.username), () =>
          joinRoom(model.username, roomId),
        )

        return [model, Array.fromOption(maybeJoinRoom)]
      },

      RoomUpdated: handleRoomUpdated(model),

      RoomStreamError: ({ error: _error }) => {
        return [model, []]
      },

      StartGameRequested: ({ roomId, playerId }) => [model, [startGame(roomId, playerId)]],

      SessionLoaded: ({ maybeSession }) => [
        evo(model, {
          maybeSession: () => maybeSession,
        }),
        [],
      ],

      RoomFetched: ({ room }) => {
        const maybeFocusRoomUsernameInput = Option.match(model.maybeSession, {
          onNone: () => Option.some(Task.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`, () => NoOp())),
          onSome: () => Option.none(),
        })

        return [
          evo(model, {
            roomRemoteData: () => RoomRemoteData.Ok({ data: room }),
          }),
          Array.fromOption(maybeFocusRoomUsernameInput),
        ]
      },

      RoomNotFound: () => [
        evo(model, {
          roomRemoteData: () => RoomRemoteData.Error({ error: 'Room not found' }),
        }),
        [],
      ],

      CopyRoomIdClicked: ({ roomId }) => [model, [copyRoomIdToClipboard(roomId)]],

      CopyRoomIdSuccess: () =>
        model.isRoomIdCopyIndicatorVisible
          ? [model, []]
          : [
              evo(model, {
                isRoomIdCopyIndicatorVisible: () => true,
              }),
              [hideRoomIdCopiedIndicator()],
            ],

      HideRoomIdCopiedIndicator: () => [
        evo(model, {
          isRoomIdCopyIndicatorVisible: () => false,
        }),
        [],
      ],

      ExitCountdownTicked: () => {
        const nextSecondsLeft = Number.decrement(model.exitCountdownSecondsLeft)
        const maybeTickCommand = optionWhen(nextSecondsLeft > 0, () => exitCountdownTick)

        return [
          evo(model, {
            exitCountdownSecondsLeft: () => nextSecondsLeft,
          }),
          Array.fromOption(maybeTickCommand),
        ]
      },

      RoomJoined: ({ roomId, player }) => {
        const session = { roomId, player }
        return [
          evo(model, {
            maybeSession: () => Option.some(session),
          }),
          [savePlayerToSessionStorage(session)],
        ]
      },
    }),
  )

const handleKeyPressed =
  (model: Model) =>
  ({ key }: { key: string }): UpdateReturn =>
    M.value(model.roomRemoteData).pipe(
      withUpdateReturn,
      M.tag('Ok', ({ data: room }) =>
        M.value(room.status).pipe(
          withUpdateReturn,
          M.tag('Waiting', () => whenWaiting(model, key, room)),
          M.tag('Finished', () => whenFinished(model, key, room)),
          M.orElse(() => [model, []]),
        ),
      ),
      M.orElse(() => [model, []]),
    )

const whenWaiting = (model: Model, key: string, room: Shared.Room): UpdateReturn =>
  M.value(key).pipe(
    withUpdateReturn,
    M.when('Backspace', () => leaveRoom(model)),
    M.when('Enter', handleStartGame(model, room)),
    M.orElse(() => [model, []]),
  )

const whenFinished = (model: Model, key: string, room: Shared.Room): UpdateReturn =>
  M.value(key).pipe(
    withUpdateReturn,
    M.when('Backspace', () =>
      model.exitCountdownSecondsLeft === 0 ? leaveRoom(model) : [model, []],
    ),
    M.when('Enter', handleStartGame(model, room)),
    M.orElse(() => [model, []]),
  )

const leaveRoom = (model: Model): UpdateReturn => [
  evo(model, {
    maybeSession: () => Option.none(),
    roomRemoteData: () => RoomRemoteData.Loading(),
  }),
  [clearSession(), pushUrl(homeRouter.build({})).pipe(Effect.as(NoOp()))],
]

const handleStartGame = (model: Model, room: Shared.Room) => (): UpdateReturn =>
  Option.match(model.maybeSession, {
    onSome: (session) => {
      const isHost = session.player.id === room.hostId
      const startGameCommand = optionWhen(isHost, () => startGame(room.id, session.player.id))
      return [model, Array.fromOption(startGameCommand)]
    },
    onNone: () => [model, []],
  })
