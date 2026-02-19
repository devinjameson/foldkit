import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

export const NoOp = ts('NoOp')
export const UsernameFormSubmitted = ts('UsernameFormSubmitted')
export const UsernameInputted = ts('UsernameInputted', { value: S.String })
export const UsernameInputBlurred = ts('UsernameInputBlurred')
export const RoomIdInputted = ts('RoomIdInputted', { value: S.String })
export const RoomIdInputBlurred = ts('RoomIdInputBlurred')
export const CreateRoomClicked = ts('CreateRoomClicked')
export const JoinRoomClicked = ts('JoinRoomClicked')
export const RoomCreated = ts('RoomCreated', { roomId: S.String, player: Shared.Player })
export const RoomJoined = ts('RoomJoined', { roomId: S.String, player: Shared.Player })
export const RoomError = ts('RoomError', { error: S.String })
export const KeyPressed = ts('KeyPressed', { key: S.String })

export const Message = S.Union(
  NoOp,
  UsernameFormSubmitted,
  UsernameInputted,
  UsernameInputBlurred,
  RoomIdInputted,
  RoomIdInputBlurred,
  CreateRoomClicked,
  JoinRoomClicked,
  RoomCreated,
  RoomJoined,
  RoomError,
  KeyPressed,
)
export type Message = typeof Message.Type

// OUT MESSAGE

export const RoomCreationSucceeded = ts('RoomCreationSucceeded', {
  roomId: S.String,
  player: Shared.Player,
})
export const RoomJoinSucceeded = ts('RoomJoinSucceeded', {
  roomId: S.String,
  player: Shared.Player,
})

export const OutMessage = S.Union(RoomCreationSucceeded, RoomJoinSucceeded)
export type OutMessage = typeof OutMessage.Type
