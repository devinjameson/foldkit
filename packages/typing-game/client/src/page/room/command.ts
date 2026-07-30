import { Effect, Option, Schema as S } from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import { Command, Dom } from 'foldkit'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import {
  ROOM_PAGE_USERNAME_INPUT_ID,
  ROOM_PLAYER_SESSION_KEY,
  USER_GAME_TEXT_INPUT_ID,
} from '../../constant'
import { RoomsClient } from '../../rpc'
import {
  CompletedClearSession,
  CompletedFocusRoomPageUsernameInput,
  CompletedFocusUserGameTextInput,
  CompletedLoadSession,
  CompletedSavePlayerSession,
  CompletedUpdatePlayerProgress,
  CompletedWaitBeforeHidingRoomIdCopiedIndicator,
  CompletedWaitForExitCountdownInterval,
  FailedCopyRoomId,
  FailedFetchRoom,
  FailedJoinRoom,
  FailedStartGame,
  SucceededCopyRoomId,
  SucceededFetchRoom,
  SucceededJoinRoom,
  SucceededStartGame,
} from './message'
import { RoomPlayerSession } from './model'

export const FetchRoom = Command.define('FetchRoom', {
  args: { roomId: S.String },
  messages: [SucceededFetchRoom, FailedFetchRoom],
  execute: ({ roomId }) =>
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const room = yield* client.getRoomById({ roomId })
      return SucceededFetchRoom({ room })
    }).pipe(Effect.catch(() => Effect.succeed(FailedFetchRoom()))),
})

export const LoadSession = Command.define('LoadSession', {
  args: { roomId: S.String },
  messages: [CompletedLoadSession],
  execute: ({ roomId }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const maybeSessionJson = yield* store.get(ROOM_PLAYER_SESSION_KEY)

      const sessionJson = yield* Effect.fromOption(
        Option.fromNullishOr(maybeSessionJson),
      )
      const decodeSession = S.decodeEffect(S.fromJsonString(RoomPlayerSession))

      return yield* decodeSession(sessionJson).pipe(
        Effect.map(session =>
          CompletedLoadSession({
            maybeSession: Option.liftPredicate(
              session,
              session => session.roomId === roomId,
            ),
          }),
        ),
      )
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(CompletedLoadSession({ maybeSession: Option.none() })),
      ),
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
})

export const JoinRoom = Command.define('JoinRoom', {
  args: { username: S.String, roomId: S.String },
  messages: [SucceededJoinRoom, FailedJoinRoom],
  execute: ({ username, roomId }) =>
    Effect.gen(function* () {
      const client = yield* RoomsClient
      const { player } = yield* client.joinRoom({ username, roomId })
      return SucceededJoinRoom({ player })
    }).pipe(Effect.catch(() => Effect.succeed(FailedJoinRoom()))),
})

export const StartGame = Command.define('StartGame', {
  args: { roomId: S.String, playerId: S.String },
  messages: [SucceededStartGame, FailedStartGame],
  execute: ({ roomId, playerId }) =>
    Effect.gen(function* () {
      const client = yield* RoomsClient
      yield* client.startGame({ roomId, playerId })
      return SucceededStartGame()
    }).pipe(Effect.catch(() => Effect.succeed(FailedStartGame()))),
})

export const UpdatePlayerProgress = Command.define('UpdatePlayerProgress', {
  args: {
    playerId: S.String,
    gameId: S.String,
    userGameText: S.String,
    charsTyped: S.Number,
  },
  messages: [CompletedUpdatePlayerProgress],
  execute: ({ playerId, gameId, userGameText, charsTyped }) =>
    Effect.gen(function* () {
      const client = yield* RoomsClient
      yield* client.updatePlayerProgress({
        playerId,
        gameId,
        userText: userGameText,
        charsTyped,
      })
      return CompletedUpdatePlayerProgress()
    }).pipe(
      Effect.catch(() => Effect.succeed(CompletedUpdatePlayerProgress())),
    ),
})

export const CopyRoomId = Command.define('CopyRoomId', {
  args: { roomId: S.String },
  messages: [SucceededCopyRoomId, FailedCopyRoomId],
  execute: ({ roomId }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(roomId),
      catch: () => new Error('Failed to copy to clipboard'),
    }).pipe(
      Effect.as(SucceededCopyRoomId()),
      Effect.catch(() => Effect.succeed(FailedCopyRoomId())),
    ),
})

export const WaitForExitCountdownInterval = Command.define(
  'WaitForExitCountdownInterval',
  {
    messages: [CompletedWaitForExitCountdownInterval],
    execute: Effect.sleep('1 second').pipe(
      Effect.as(CompletedWaitForExitCountdownInterval()),
    ),
  },
)

const COPY_INDICATOR_DURATION = '2 seconds'

export const WaitBeforeHidingRoomIdCopiedIndicator = Command.define(
  'WaitBeforeHidingRoomIdCopiedIndicator',
  {
    messages: [CompletedWaitBeforeHidingRoomIdCopiedIndicator],
    execute: Effect.sleep(COPY_INDICATOR_DURATION).pipe(
      Effect.as(CompletedWaitBeforeHidingRoomIdCopiedIndicator()),
    ),
  },
)

// SESSION COMMANDS

export const SavePlayerSession = Command.define('SavePlayerSession', {
  args: { session: RoomPlayerSession },
  messages: [CompletedSavePlayerSession],
  execute: ({ session }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const encodeSession = S.encodeEffect(S.fromJsonString(RoomPlayerSession))
      const sessionJson = yield* encodeSession(session)
      yield* store.set(ROOM_PLAYER_SESSION_KEY, sessionJson)
      return CompletedSavePlayerSession()
    }).pipe(
      Effect.catch(() => Effect.succeed(CompletedSavePlayerSession())),
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
})

export const ClearSession = Command.define('ClearSession', {
  messages: [CompletedClearSession],
  execute: Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.remove(ROOM_PLAYER_SESSION_KEY)
    return CompletedClearSession()
  }).pipe(
    Effect.catch(() => Effect.succeed(CompletedClearSession())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  ),
})

export const FocusRoomPageUsernameInput = Command.define(
  'FocusRoomPageUsernameInput',
  {
    messages: [CompletedFocusRoomPageUsernameInput],
    execute: Dom.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`).pipe(
      Effect.ignore,
      Effect.as(CompletedFocusRoomPageUsernameInput()),
    ),
  },
)

export const FocusUserGameTextInput = Command.define('FocusUserGameTextInput', {
  messages: [CompletedFocusUserGameTextInput],
  execute: Dom.focus(`#${USER_GAME_TEXT_INPUT_ID}`).pipe(
    Effect.ignore,
    Effect.as(CompletedFocusUserGameTextInput()),
  ),
})
