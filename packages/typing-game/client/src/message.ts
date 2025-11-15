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
export type CreateRoomClicked = typeof CreateRoomClicked.Type
export type JoinRoomClicked = typeof JoinRoomClicked.Type
export type RoomCreated = typeof RoomCreated.Type
export type RoomJoined = typeof RoomJoined.Type
export type RoomError = typeof RoomError.Type
export type RoomUpdated = typeof RoomUpdated.Type
export type RoomStreamError = typeof RoomStreamError.Type
export type StartGameRequested = typeof StartGameRequested.Type
export type SessionLoaded = typeof SessionLoaded.Type

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
  CreateRoomClicked,
  JoinRoomClicked,
  RoomCreated,
  RoomJoined,
  RoomError,
  RoomUpdated,
  RoomStreamError,
  StartGameRequested,
  SessionLoaded,
)
export type Message = typeof Message.Type

export {
  CreateRoomClicked,
  JoinRoomClicked,
  KeyPressed,
  LinkClicked,
  RoomCreated,
  RoomError,
  RoomIdInputted,
  RoomJoined,
  RoomStreamError,
  RoomIdInputBlurred,
  SessionLoaded,
  StartGameRequested,
  UrlChanged,
  UsernameFormSubmitted,
  UsernameInputBlurred,
  UserTextInputted,
  UsernameInputted,
}
