import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { RoomPlayerSession } from './model'

export const NoOp = ts('NoOp')
export const KeyPressed = ts('KeyPressed', { key: S.String })
export const UserTextInputted = ts('UserTextInputted', { value: S.String })
export const RoomPageUsernameInputBlurred = ts('RoomPageUsernameInputBlurred')
export const RoomPageUsernameInputted = ts('RoomPageUsernameInputted', { value: S.String })
export const JoinRoomFromPageSubmitted = ts('JoinRoomFromPageSubmitted', { roomId: S.String })
export const RoomUpdated = ts('RoomUpdated', {
  room: Shared.Room,
  maybePlayerProgress: S.Option(Shared.PlayerProgress),
})
export const RoomStreamError = ts('RoomStreamError', { error: S.String })
export const StartGameRequested = ts('StartGameRequested', { roomId: S.String, playerId: S.String })
export const SessionLoaded = ts('SessionLoaded', { maybeSession: S.Option(RoomPlayerSession) })
export const RoomFetched = ts('RoomFetched', { room: Shared.Room })
export const RoomNotFound = ts('RoomNotFound', { roomId: S.String })
export const CopyRoomIdClicked = ts('CopyRoomIdClicked', { roomId: S.String })
export const CopyRoomIdSuccess = ts('CopyRoomIdSuccess')
export const HideRoomIdCopiedIndicator = ts('HideRoomIdCopiedIndicator')
export const RoomJoined = ts('RoomJoined', { roomId: S.String, player: Shared.Player })
export const RoomError = ts('RoomError', { error: S.String })

export type NoOp = typeof NoOp.Type
export type KeyPressed = typeof KeyPressed.Type
export type UserTextInputted = typeof UserTextInputted.Type
export type RoomPageUsernameInputBlurred = typeof RoomPageUsernameInputBlurred.Type
export type RoomPageUsernameInputted = typeof RoomPageUsernameInputted.Type
export type JoinRoomFromPageSubmitted = typeof JoinRoomFromPageSubmitted.Type
export type RoomUpdated = typeof RoomUpdated.Type
export type RoomStreamError = typeof RoomStreamError.Type
export type StartGameRequested = typeof StartGameRequested.Type
export type SessionLoaded = typeof SessionLoaded.Type
export type RoomFetched = typeof RoomFetched.Type
export type RoomNotFound = typeof RoomNotFound.Type
export type CopyRoomIdClicked = typeof CopyRoomIdClicked.Type
export type CopyRoomIdSuccess = typeof CopyRoomIdSuccess.Type
export type HideRoomIdCopiedIndicator = typeof HideRoomIdCopiedIndicator.Type
export type RoomJoined = typeof RoomJoined.Type
export type RoomError = typeof RoomError.Type

export const Message = S.Union(
  NoOp,
  KeyPressed,
  UserTextInputted,
  RoomPageUsernameInputBlurred,
  RoomPageUsernameInputted,
  JoinRoomFromPageSubmitted,
  RoomUpdated,
  RoomStreamError,
  StartGameRequested,
  SessionLoaded,
  RoomFetched,
  RoomNotFound,
  CopyRoomIdClicked,
  CopyRoomIdSuccess,
  HideRoomIdCopiedIndicator,
  RoomJoined,
  RoomError,
)
export type Message = typeof Message.Type
