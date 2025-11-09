import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'
import { FieldSchema } from 'foldkit/fieldValidation'

import { AppRoute } from './route'

export const RoomPlayerSession = S.Struct({
  roomId: S.String,
  player: Shared.Player,
})
export type RoomPlayerSession = typeof RoomPlayerSession.Type

export const Model = S.Struct({
  route: AppRoute,
  usernameInput: FieldSchema(S.String),
  roomIdInput: FieldSchema(S.String),
  roomIdValidationId: S.Positive,
  roomFormError: S.Option(S.String),
  maybeRoom: S.Option(Shared.Room),
  maybeSession: S.Option(RoomPlayerSession),
  userText: S.String,
  charsTyped: S.Number,
})
export type Model = typeof Model.Type
