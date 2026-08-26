import { Array, Match as M, Number, Option, flow, pipe } from 'effect'
import { type Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { RoomsClient } from '../../../rpc'
import { CreateRoom, FocusRoomIdInput, FocusUsernameInput } from '../command'
import { Message } from '../message'
import { HOME_ACTIONS, HomeAction, HomeStep, Model } from '../model'

type UpdateReturn = Update.Return<Model, Message, RoomsClient>
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const handleKeyPressed =
  (model: Model) =>
  ({ key }: { key: string }): UpdateReturn =>
    M.value(model.homeStep).pipe(
      withUpdateReturn,
      M.tag('SelectAction', whenSelectAction(model, key)),
      M.orElse(() => ({ model })),
    )

const whenSelectAction =
  (model: Model, key: string) =>
  (selectAction: typeof HomeStep.SelectAction.Type): UpdateReturn =>
    M.value(key).pipe(
      withUpdateReturn,
      M.when('ArrowUp', () =>
        moveSelection(Number.decrement)(model, selectAction),
      ),
      M.when('ArrowDown', () =>
        moveSelection(Number.increment)(model, selectAction),
      ),
      M.when('Enter', () => confirmSelection(model)(selectAction)),
      M.orElse(() => ({ model })),
    )

const moveSelection =
  (f: (index: number) => number) =>
  (
    model: Model,
    { username, selectedAction }: typeof HomeStep.SelectAction.Type,
  ): UpdateReturn => ({
    model: evo(model, {
      homeStep: () =>
        HomeStep.SelectAction({
          username,
          selectedAction: cycleAction(f)(selectedAction),
        }),
    }),
  })

const cycleAction =
  (f: (a: number) => number) => (selectedAction: HomeAction) => {
    const homeActionsLength = Array.length(HOME_ACTIONS)

    return pipe(
      HOME_ACTIONS,
      Array.findFirstIndex(action => action === selectedAction),
      Option.map(
        flow(
          f,
          Number.remainder(homeActionsLength),
          remainder =>
            remainder < 0 ? remainder + homeActionsLength : remainder,
          nextIndex => Array.getUnsafe(HOME_ACTIONS, nextIndex),
        ),
      ),
      Option.getOrElse(() => selectedAction),
    )
  }

const confirmSelection =
  (model: Model) =>
  (selectAction: typeof HomeStep.SelectAction.Type): UpdateReturn =>
    M.value(selectAction.selectedAction).pipe(
      withUpdateReturn,
      M.when('CreateRoom', () => ({
        model,
        commands: [CreateRoom({ username: selectAction.username })],
      })),
      M.when('JoinRoom', () => ({
        model: evo(model, {
          homeStep: () =>
            HomeStep.EnterRoomId({
              username: selectAction.username,
              roomId: '',
            }),
        }),
        commands: [FocusRoomIdInput()],
      })),
      M.when('ChangeUsername', () => ({
        model: evo(model, {
          homeStep: () => HomeStep.EnterUsername({ username: '' }),
        }),
        commands: [FocusUsernameInput()],
      })),
      M.exhaustive,
    )
