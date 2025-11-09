import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { Runtime, Url } from 'foldkit'
import { FieldSchema } from 'foldkit/fieldValidation'
import { ts } from 'foldkit/schema'

import { RoomPlayerSession } from './model'

export const NoOp = ts('NoOp')
const LinkClicked = ts('LinkClicked', {
  request: Runtime.UrlRequest,
})
const UrlChanged = ts('UrlChanged', { url: Url.Url })
const UsernameInputted = ts('UsernameInputted', { value: S.String })
const RoomIdInputted = ts('RoomIdInputted', { value: S.String })
const UserTextInputted = ts('UserTextInputted', { value: S.String })
const RoomIdValidated = ts('RoomIdValidated', {
  validationId: S.Number,
  field: FieldSchema(S.String),
})
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
export type UsernameInputted = typeof UsernameInputted.Type
export type RoomIdInputted = typeof RoomIdInputted.Type
export type UserTextInputted = typeof UserTextInputted.Type
export type RoomIdValidated = typeof RoomIdValidated.Type
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
  UsernameInputted,
  RoomIdInputted,
  UserTextInputted,
  RoomIdValidated,
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
  CreateRoomClicked,
  JoinRoomClicked,
  LinkClicked,
  RoomCreated,
  RoomError,
  RoomIdInputted,
  RoomIdValidated,
  RoomJoined,
  RoomStreamError,
  SessionLoaded,
  StartGameClicked,
  UrlChanged,
  UserTextInputted,
  UsernameInputted,
}
