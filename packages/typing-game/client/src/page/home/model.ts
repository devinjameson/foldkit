import { Match, Schema as S } from 'effect'

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

export const Model = S.Struct({
  homeStep: HomeStep,
  formError: S.Option(S.String),
})
export type Model = typeof Model.Type
