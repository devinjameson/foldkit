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

export type NoOp = typeof NoOp.Type
export type UsernameFormSubmitted = typeof UsernameFormSubmitted.Type
export type UsernameInputted = typeof UsernameInputted.Type
export type UsernameInputBlurred = typeof UsernameInputBlurred.Type
export type RoomIdInputted = typeof RoomIdInputted.Type
export type RoomIdInputBlurred = typeof RoomIdInputBlurred.Type
export type CreateRoomClicked = typeof CreateRoomClicked.Type
export type JoinRoomClicked = typeof JoinRoomClicked.Type
export type RoomCreated = typeof RoomCreated.Type
export type RoomJoined = typeof RoomJoined.Type
export type RoomError = typeof RoomError.Type
export type KeyPressed = typeof KeyPressed.Type

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
