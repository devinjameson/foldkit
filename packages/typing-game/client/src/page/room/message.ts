import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Shared from '@typing-game/shared'

import { RoomPlayerSession } from './model'

export const Message = defineMessageUnion({
  CompletedFocusRoomPageUsernameInput: {},
  CompletedFocusUserGameTextInput: {},
  CompletedNavigateHome: {},
  SucceededStartGame: {},
  FailedStartGame: {},
  CompletedUpdatePlayerProgress: {},
  CompletedSavePlayerSession: {},
  CompletedClearSession: {},
  FailedJoinRoom: {},
  FailedCopyRoomId: {},
  PressedKey: { key: S.String },
  ChangedUserText: { value: S.String },
  BlurredRoomPageUsernameInput: {},
  ChangedRoomPageUsername: { value: S.String },
  SubmittedJoinRoomFromPage: {},
  UpdatedRoom: {
    room: Shared.Room,
    maybePlayerProgress: S.Option(Shared.PlayerProgress),
  },
  FailedStreamRoom: { error: S.String },
  CompletedLoadSession: { maybeSession: S.Option(RoomPlayerSession) },
  SucceededFetchRoom: { room: Shared.Room },
  FailedFetchRoom: {},
  ClickedCopyRoomId: {},
  SucceededCopyRoomId: {},
  CompletedWaitBeforeHidingRoomIdCopiedIndicator: {},
  CompletedWaitForExitCountdownInterval: {},
  SucceededJoinRoom: { player: Shared.Player },
})
export type Message = typeof Message.Type
