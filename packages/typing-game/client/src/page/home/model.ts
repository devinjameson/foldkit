import { Match, Schema as S } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const HomeAction = S.Literals([
  'CreateRoom',
  'JoinRoom',
  'ChangeUsername',
])
export type HomeAction = typeof HomeAction.Type

export const HOME_ACTIONS: ReadonlyArray<HomeAction> = [
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

export const HomeStep = defineTaggedUnion({
  EnterUsername: { username: S.String },
  SelectAction: { username: S.String, selectedAction: HomeAction },
  EnterRoomId: { username: S.String, roomId: S.String },
})
export type HomeStep = typeof HomeStep.Type

export const Model = S.Struct({
  homeStep: HomeStep,
  formError: S.Option(S.String),
})
export type Model = typeof Model.Type

export const capturesKeyboard = (model: Model): boolean =>
  Match.value(model.homeStep).pipe(
    Match.tag('SelectAction', () => true),
    Match.orElse(() => false),
  )
