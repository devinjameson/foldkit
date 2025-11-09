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
const BootCompleted = ts('BootCompleted')
const UsernameFormSubmitted = ts('UsernameFormSubmitted')
const KeyPressed = ts('KeyPressed', { key: S.String })
const UsernameInputted = ts('UsernameInputted', { value: S.String })
const RoomIdInputted = ts('RoomIdInputted', { value: S.String })
const UserTextInputted = ts('UserTextInputted', { value: S.String })
const UsernameInputBlurred = ts('UsernameInputBlurred')
const SessionIdInputBlurred = ts('SessionIdInputBlurred')
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
const StartGameClicked = ts('StartGameClicked', { roomId: S.String })
const SessionLoaded = ts('SessionLoaded', { maybeSession: S.Option(RoomPlayerSession) })

export type NoOp = typeof NoOp.Type
export type LinkClicked = typeof LinkClicked.Type
export type UrlChanged = typeof UrlChanged.Type
export type BootCompleted = typeof BootCompleted.Type
export type UsernameFormSubmitted = typeof UsernameFormSubmitted.Type
export type KeyPressed = typeof KeyPressed.Type
export type UsernameInputted = typeof UsernameInputted.Type
export type RoomIdInputted = typeof RoomIdInputted.Type
export type UserTextInputted = typeof UserTextInputted.Type
export type UsernameInputBlurred = typeof UsernameInputBlurred.Type
export type SessionIdInputBlurred = typeof SessionIdInputBlurred.Type
export type CreateRoomClicked = typeof CreateRoomClicked.Type
export type JoinRoomClicked = typeof JoinRoomClicked.Type
export type RoomCreated = typeof RoomCreated.Type
export type RoomJoined = typeof RoomJoined.Type
export type RoomError = typeof RoomError.Type
export type RoomUpdated = typeof RoomUpdated.Type
export type RoomStreamError = typeof RoomStreamError.Type
export type StartGameClicked = typeof StartGameClicked.Type
export type SessionLoaded = typeof SessionLoaded.Type

export const Message = S.Union(
  NoOp,
  LinkClicked,
  UrlChanged,
  BootCompleted,
  UsernameFormSubmitted,
  KeyPressed,
  UsernameInputted,
  RoomIdInputted,
  UserTextInputted,
  UsernameInputBlurred,
  SessionIdInputBlurred,
  CreateRoomClicked,
  JoinRoomClicked,
  RoomCreated,
  RoomJoined,
  RoomError,
  RoomUpdated,
  RoomStreamError,
  StartGameClicked,
  SessionLoaded,
)
export type Message = typeof Message.Type

export {
  BootCompleted,
  CreateRoomClicked,
  JoinRoomClicked,
  KeyPressed,
  LinkClicked,
  RoomCreated,
  RoomError,
  RoomIdInputted,
  RoomJoined,
  RoomStreamError,
  SessionIdInputBlurred,
  SessionLoaded,
  StartGameClicked,
  UrlChanged,
  UsernameFormSubmitted,
  UsernameInputBlurred,
  UserTextInputted,
  UsernameInputted,
}
