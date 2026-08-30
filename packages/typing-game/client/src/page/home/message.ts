import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import * as Shared from '@typing-game/shared'

export const Message = defineMessageUnion({
  CompletedFocusUsernameInput: {},
  CompletedFocusRoomIdInput: {},
  SubmittedUsernameForm: {},
  ChangedUsername: { value: S.String },
  BlurredUsernameInput: {},
  ChangedRoomId: { value: S.String },
  BlurredRoomIdInput: {},
  SubmittedJoinRoomForm: {},
  SucceededCreateRoom: { roomId: S.String, player: Shared.Player },
  SucceededJoinRoom: { roomId: S.String, player: Shared.Player },
  FailedCreateRoom: { error: S.String },
  FailedJoinRoom: { error: S.String },
  PressedKey: { key: S.String },
})
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = defineMessageUnion({
  CreatedRoom: { roomId: S.String, player: Shared.Player },
  JoinedRoom: { roomId: S.String, player: Shared.Player },
})
export type OutMessage = typeof OutMessage.Type
