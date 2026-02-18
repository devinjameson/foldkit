import { Array, Match as M, Option, String as Str } from 'effect'
import { Runtime, Task } from 'foldkit'
import { evo } from 'foldkit/struct'

import { createRoom, joinRoom } from '../../../command'
import { ROOM_ID_INPUT_ID, USERNAME_INPUT_ID } from '../../../constant'
import { optionWhen } from '../../../optionWhen'
import { Message, NoOp } from '../message'
import { EnterRoomId, EnterUsername, Model, SelectAction } from '../model'
import { handleKeyPressed } from './handleKeyPressed'

export type UpdateReturn = [Model, ReadonlyArray<Runtime.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      NoOp: () => [model, []],

      UsernameFormSubmitted: () =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterUsername', ({ username }) => {
            const nextModel = Str.isNonEmpty(username)
              ? evo(model, {
                  homeStep: () => SelectAction({ username, selectedAction: 'CreateRoom' }),
                })
              : model

            return [nextModel, []]
          }),
          M.orElse(() => [model, []]),
        ),

      KeyPressed: handleKeyPressed(model),

      UsernameInputted: ({ value }) =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterUsername', () => [
            evo(model, {
              homeStep: () => EnterUsername({ username: value }),
              formError: () => Option.none(),
            }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      UsernameInputBlurred: () => [model, [Task.focus(`#${USERNAME_INPUT_ID}`, () => NoOp())]],

      RoomIdInputBlurred: () => [model, [Task.focus(`#${ROOM_ID_INPUT_ID}`, () => NoOp())]],

      RoomIdInputted: ({ value }) =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterRoomId', ({ username, roomIdValidationId }) => [
            evo(model, {
              homeStep: () =>
                EnterRoomId({
                  username,
                  roomId: value,
                  roomIdValidationId,
                }),
              formError: () => Option.none(),
            }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      CreateRoomClicked: () =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('SelectAction', ({ username }) => [model, [createRoom(username)]]),
          M.orElse(() => [model, []]),
        ),

      JoinRoomClicked: () =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterRoomId', ({ username, roomId }) => {
            if (roomId === 'exit') {
              return [
                evo(model, {
                  homeStep: () => SelectAction({ username, selectedAction: 'JoinRoom' }),
                }),
                [],
              ]
            }

            const maybeJoinCommand = optionWhen(Str.isNonEmpty(roomId), () =>
              joinRoom(username, roomId),
            )

            return [model, Array.fromOption(maybeJoinCommand)]
          }),
          M.orElse(() => [model, []]),
        ),

      RoomCreated: () => [model, []],

      RoomJoined: () => [model, []],

      RoomError: ({ error }) => [
        evo(model, {
          formError: () => Option.some(error),
        }),
        [],
      ],
    }),
  )
