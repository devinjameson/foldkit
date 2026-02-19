import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

export const NoOp = ts('NoOp')
export const SubmittedUsernameForm = ts('SubmittedUsernameForm')
export const InputtedUsername = ts('InputtedUsername', { value: S.String })
export const BlurredUsernameInput = ts('BlurredUsernameInput')
export const InputtedRoomId = ts('InputtedRoomId', { value: S.String })
export const BlurredRoomIdInput = ts('BlurredRoomIdInput')
export const ClickedCreateRoom = ts('ClickedCreateRoom')
export const ClickedJoinRoom = ts('ClickedJoinRoom')
export const CreatedRoom = ts('CreatedRoom', { roomId: S.String, player: Shared.Player })
export const JoinedRoom = ts('JoinedRoom', { roomId: S.String, player: Shared.Player })
export const RoomError = ts('RoomError', { error: S.String })
export const PressedKey = ts('PressedKey', { key: S.String })

export const Message = S.Union(
  NoOp,
  SubmittedUsernameForm,
  InputtedUsername,
  BlurredUsernameInput,
  InputtedRoomId,
  BlurredRoomIdInput,
  ClickedCreateRoom,
  ClickedJoinRoom,
  CreatedRoom,
  JoinedRoom,
  RoomError,
  PressedKey,
)
export type Message = typeof Message.Type

// OUT MESSAGE

export const SucceededRoomCreation = ts('SucceededRoomCreation', {
  roomId: S.String,
  player: Shared.Player,
})
export const SucceededRoomJoin = ts('SucceededRoomJoin', {
  roomId: S.String,
  player: Shared.Player,
})

export const OutMessage = S.Union(SucceededRoomCreation, SucceededRoomJoin)
export type OutMessage = typeof OutMessage.Type
