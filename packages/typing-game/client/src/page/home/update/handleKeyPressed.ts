import { Array, Match as M, Number, Option, flow, pipe } from 'effect'
import { Runtime, Task } from 'foldkit'
import { evo } from 'foldkit/struct'

import { createRoom } from '../../../command'
import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../../constant'
import { Message, NoOp } from '../message'
import { EnterRoomId, EnterUsername, HOME_ACTIONS, HomeAction, Model, SelectAction } from '../model'

type UpdateReturn = [Model, ReadonlyArray<Runtime.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const handleKeyPressed =
  (model: Model) =>
  ({ key }: { key: string }): UpdateReturn =>
    M.value(model.homeStep).pipe(
      withUpdateReturn,
      M.tag('SelectAction', whenSelectAction(model, key)),
      M.orElse(() => [model, []]),
    )

const whenSelectAction =
  (model: Model, key: string) =>
  (selectAction: SelectAction): UpdateReturn =>
    M.value(key).pipe(
      withUpdateReturn,
      M.when('ArrowUp', () => moveSelection(Number.decrement)(model, selectAction)),
      M.when('ArrowDown', () => moveSelection(Number.increment)(model, selectAction)),
      M.when('Enter', () => confirmSelection(model)(selectAction)),
      M.orElse(() => [model, []]),
    )

const moveSelection =
  (f: (index: number) => number) =>
  (model: Model, { username, selectedAction }: SelectAction): UpdateReturn => [
    evo(model, {
      homeStep: () =>
        SelectAction.make({
          username,
          selectedAction: cycleAction(f)(selectedAction),
        }),
    }),
    [],
  ]

const cycleAction = (f: (a: number) => number) => (selectedAction: HomeAction) => {
  const homeActionsLength = Array.length(HOME_ACTIONS)

  return pipe(
    HOME_ACTIONS,
    Array.findFirstIndex((action) => action === selectedAction),
    Option.map(
      flow(
        f,
        Number.remainder(homeActionsLength),
        (remainder) => (remainder < 0 ? remainder + homeActionsLength : remainder),
        (nextIndex) => Array.unsafeGet(HOME_ACTIONS, nextIndex),
      ),
    ),
    Option.getOrThrow,
  )
}

const confirmSelection =
  (model: Model) =>
  (selectAction: SelectAction): UpdateReturn =>
    M.value(selectAction.selectedAction).pipe(
      withUpdateReturn,
      M.when('CreateRoom', () => [model, [createRoom(selectAction.username)]]),
      M.when('JoinRoom', () => [
        evo(model, {
          homeStep: () =>
            EnterRoomId.make({
              username: selectAction.username,
              roomId: '',
              roomIdValidationId: Date.now(),
            }),
        }),
        [Task.focus(`#${ROOM_ID_INPUT_ID}`, () => NoOp.make())],
      ]),
      M.when('ChangeUsername', () => [
        evo(model, {
          homeStep: () => EnterUsername.make({ username: '' }),
        }),
        [Task.focus(`#${USERNAME_INPUT_ID}`, () => NoOp.make())],
      ]),
      M.exhaustive,
    )
