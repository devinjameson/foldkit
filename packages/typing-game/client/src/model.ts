import * as Shared from '@typing-game/shared'
import { Match, Schema as S } from 'effect'

import { makeRemoteData } from './makeRemoteData'
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

export const homeActionToLabel = Match.type<HomeAction>().pipe(
  Match.when('CreateRoom', () => 'Create room'),
  Match.when('JoinRoom', () => 'Join room'),
  Match.when('ChangeUsername', () => 'Change username'),
  Match.exhaustive,
)

export const EnterUsername = S.TaggedStruct('EnterUsername', {
  username: S.String,
})
export type EnterUsername = typeof EnterUsername.Type

export const SelectAction = S.TaggedStruct('SelectAction', {
  username: S.String,
  selectedAction: HomeAction,
})
export type SelectAction = typeof SelectAction.Type

export const EnterRoomId = S.TaggedStruct('EnterRoomId', {
  username: S.String,
  roomId: S.String,
  roomIdValidationId: S.Number,
})
export type EnterRoomId = typeof EnterRoomId.Type

export const HomeStep = S.Union(EnterUsername, SelectAction, EnterRoomId)
export type HomeStep = typeof HomeStep.Type

export const RoomRemoteData = makeRemoteData(S.String, Shared.Room)

export const Model = S.Struct({
  bootStatus: BootStatus,
  route: AppRoute,
  homeStep: HomeStep,
  roomFormError: S.Option(S.String),
  roomRemoteData: RoomRemoteData.Union,
  maybeSession: S.Option(RoomPlayerSession),
  userText: S.String,
  charsTyped: S.Number,
  roomPageUsername: S.String,
  isRoomIdCopyIndicatorVisible: S.Boolean,
})
export type Model = typeof Model.Type
