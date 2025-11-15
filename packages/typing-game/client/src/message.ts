import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { Runtime, Url } from 'foldkit'
import { ts } from 'foldkit/schema'

import { RoomPlayerSession } from './model'

export const NoOp = ts('NoOp')
const LinkClicked = ts('LinkClicked', {
  request: Runtime.UrlRequest,
})
const UrlChanged = ts('UrlChanged', { url: Url.Url })
const UsernameFormSubmitted = ts('UsernameFormSubmitted')
const KeyPressed = ts('KeyPressed', { key: S.String })
const UsernameInputted = ts('UsernameInputted', { value: S.String })
const RoomIdInputted = ts('RoomIdInputted', { value: S.String })
const UserTextInputted = ts('UserTextInputted', { value: S.String })
const UsernameInputBlurred = ts('UsernameInputBlurred')
const RoomIdInputBlurred = ts('RoomIdInputBlurred')
const RoomPageUsernameInputBlurred = ts('RoomPageUsernameInputBlurred')
const CreateRoomClicked = ts('CreateRoomClicked')
const JoinRoomClicked = ts('JoinRoomClicked')
const RoomCreated = ts('RoomCreated', { roomId: S.String, player: Shared.Player })
const RoomJoined = ts('RoomJoined', { roomId: S.String, player: Shared.Player })
const RoomError = ts('RoomError', { error: S.String })
export const RoomUpdated = ts('RoomUpdated', {
  room: Shared.Room,
  maybePlayerProgress: S.Option(Shared.PlayerProgress),
})
const RoomStreamError = ts('RoomStreamError', { error: S.String })
const StartGameRequested = ts('StartGameRequested', { roomId: S.String, playerId: S.String })
const SessionLoaded = ts('SessionLoaded', { maybeSession: S.Option(RoomPlayerSession) })
const RoomFetched = ts('RoomFetched', { room: Shared.Room })
const RoomNotFound = ts('RoomNotFound', { roomId: S.String })
const RoomPageUsernameInputted = ts('RoomPageUsernameInputted', { value: S.String })
const JoinRoomFromPageSubmitted = ts('JoinRoomFromPageSubmitted', { roomId: S.String })
const CopyRoomIdClicked = ts('CopyRoomIdClicked', { roomId: S.String })
const CopyRoomIdSuccess = ts('CopyRoomIdSuccess')
const HideRoomIdCopiedIndicator = ts('HideRoomIdCopiedIndicator')

export type NoOp = typeof NoOp.Type
export type LinkClicked = typeof LinkClicked.Type
export type UrlChanged = typeof UrlChanged.Type
export type UsernameFormSubmitted = typeof UsernameFormSubmitted.Type
export type KeyPressed = typeof KeyPressed.Type
export type UsernameInputted = typeof UsernameInputted.Type
export type RoomIdInputted = typeof RoomIdInputted.Type
export type UserTextInputted = typeof UserTextInputted.Type
export type UsernameInputBlurred = typeof UsernameInputBlurred.Type
export type RoomIdInputBlurred = typeof RoomIdInputBlurred.Type
export type RoomPageUsernameInputBlurred = typeof RoomPageUsernameInputBlurred.Type
export type CreateRoomClicked = typeof CreateRoomClicked.Type
export type JoinRoomClicked = typeof JoinRoomClicked.Type
export type RoomCreated = typeof RoomCreated.Type
export type RoomJoined = typeof RoomJoined.Type
export type RoomError = typeof RoomError.Type
export type RoomUpdated = typeof RoomUpdated.Type
export type RoomStreamError = typeof RoomStreamError.Type
export type StartGameRequested = typeof StartGameRequested.Type
export type SessionLoaded = typeof SessionLoaded.Type
export type RoomFetched = typeof RoomFetched.Type
export type RoomNotFound = typeof RoomNotFound.Type
export type RoomPageUsernameInputted = typeof RoomPageUsernameInputted.Type
export type JoinRoomFromPageSubmitted = typeof JoinRoomFromPageSubmitted.Type
export type CopyRoomIdClicked = typeof CopyRoomIdClicked.Type
export type CopyRoomIdSuccess = typeof CopyRoomIdSuccess.Type
export type HideRoomIdCopiedIndicator = typeof HideRoomIdCopiedIndicator.Type

export const Message = S.Union(
  NoOp,
  LinkClicked,
  UrlChanged,
  UsernameFormSubmitted,
  KeyPressed,
  UsernameInputted,
  RoomIdInputted,
  UserTextInputted,
  UsernameInputBlurred,
  RoomIdInputBlurred,
  RoomPageUsernameInputBlurred,
  CreateRoomClicked,
  JoinRoomClicked,
  RoomCreated,
  RoomJoined,
  RoomError,
  RoomUpdated,
  RoomStreamError,
  StartGameRequested,
  SessionLoaded,
  RoomFetched,
  RoomNotFound,
  RoomPageUsernameInputted,
  JoinRoomFromPageSubmitted,
  CopyRoomIdClicked,
  CopyRoomIdSuccess,
  HideRoomIdCopiedIndicator,
)
export type Message = typeof Message.Type

export {
  CopyRoomIdClicked,
  CopyRoomIdSuccess,
  CreateRoomClicked,
  HideRoomIdCopiedIndicator,
  JoinRoomClicked,
  JoinRoomFromPageSubmitted,
  KeyPressed,
  LinkClicked,
  RoomCreated,
  RoomError,
  RoomFetched,
  RoomIdInputBlurred,
  RoomIdInputted,
  RoomJoined,
  RoomNotFound,
  RoomPageUsernameInputBlurred,
  RoomPageUsernameInputted,
  RoomStreamError,
  SessionLoaded,
  StartGameRequested,
  UrlChanged,
  UsernameFormSubmitted,
  UsernameInputBlurred,
  UsernameInputted,
  UserTextInputted,
}
