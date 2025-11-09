import * as Shared from '@typing-game/shared'
import { Schema as S } from 'effect'

import { AppRoute } from './route'

export const BootStatus = S.Literal('Booting', 'Ready')
export type BootStatus = typeof BootStatus.Type

export const RoomPlayerSession = S.Struct({
  roomId: S.String,
  player: Shared.Player,
})
export type RoomPlayerSession = typeof RoomPlayerSession.Type

export const HomeAction = S.Literal('CreateRoom', 'JoinRoom', 'ChangeUsername')
export type HomeAction = typeof HomeAction.Type

export const HOME_ACTIONS: readonly HomeAction[] = [
  'CreateRoom',
  'JoinRoom',
  'ChangeUsername',
] as const

export const EnterUsername = S.TaggedStruct('EnterUsername', {
  username: S.String,
})
export type EnterUsername = typeof EnterUsername.Type

export const SelectAction = S.TaggedStruct('SelectAction', {
  username: S.String,
  selectedAction: HomeAction,
})
export type SelectAction = typeof SelectAction.Type

export const EnterSessionId = S.TaggedStruct('EnterSessionId', {
  username: S.String,
  sessionId: S.String,
  sessionIdValidationId: S.Number,
})
export type EnterSessionId = typeof EnterSessionId.Type

export const HomeStep = S.Union(EnterUsername, SelectAction, EnterSessionId)
export type HomeStep = typeof HomeStep.Type

export const Model = S.Struct({
  bootStatus: BootStatus,
  route: AppRoute,
  homeStep: HomeStep,
  roomFormError: S.Option(S.String),
  maybeRoom: S.Option(Shared.Room),
  maybeSession: S.Option(RoomPlayerSession),
  userText: S.String,
  charsTyped: S.Number,
})
export type Model = typeof Model.Type
