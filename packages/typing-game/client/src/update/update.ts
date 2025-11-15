import { Array, Effect, Match as M, Number, Option, String as Str, flow, pipe } from 'effect'
import { Runtime, Task, Url } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'

import {
  createRoom,
  joinRoom,
  navigateToRoom,
  savePlayerToSessionStorage,
  startGame,
  updatePlayerProgress,
} from '../command'
import { ROOM_ID_INPUT_ID, ROOM_PAGE_USERNAME_INPUT_ID, USERNAME_INPUT_ID } from '../constant'
import { CreateRoomClicked, Message, NoOp, StartGameRequested } from '../message'
import {
  EnterRoomId,
  EnterUsername,
  HOME_ACTIONS,
  Model,
  RoomRemoteData,
  SelectAction,
} from '../model'
import { optionWhen } from '../optionWhen'
import { urlToAppRoute } from '../route'
import { validateUserTextInput } from '../validation'
import { handleRoomUpdated } from './handleRoomUpdated'

type UpdateReturn<Model, Message> = [Model, ReadonlyArray<Runtime.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn<Model, Message>>()

export const update = (model: Model, message: Message): UpdateReturn<Model, Message> =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      NoOp: () => [model, []],

      UsernameFormSubmitted: () =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterUsername', ({ username }) => {
            if (Str.isEmpty(username)) {
              return [model, []]
            }
            return [
              evo(model, {
                homeStep: () => SelectAction.make({ username, selectedAction: 'CreateRoom' }),
              }),
              [],
            ]
          }),
          M.orElse(() => [model, []]),
        ),

      KeyPressed: ({ key }) =>
        M.value(model.roomRemoteData).pipe(
          withUpdateReturn,
          M.tag('Ok', ({ data: room }) =>
            M.value(room.status).pipe(
              withUpdateReturn,
              M.tag('Waiting', () =>
                M.value(key).pipe(
                  withUpdateReturn,
                  M.when('Enter', () =>
                    Option.match(model.maybeSession, {
                      onSome: (session) => {
                        const isHost = session.player.id === room.hostId
                        const startGameRequested = optionWhen(isHost, () =>
                          Effect.succeed(
                            StartGameRequested.make({
                              roomId: room.id,
                              playerId: session.player.id,
                            }),
                          ),
                        )
                        return [model, Array.getSomes([startGameRequested])]
                      },
                      onNone: () => [model, []],
                    }),
                  ),
                  M.orElse(() => [model, []]),
                ),
              ),
              M.tag('Finished', () =>
                M.value(key).pipe(
                  withUpdateReturn,
                  M.when('Enter', () =>
                    Option.match(model.maybeSession, {
                      onSome: (session) => {
                        const isHost = session.player.id === room.hostId
                        const startGameRequested = optionWhen(isHost, () =>
                          Effect.succeed(
                            StartGameRequested.make({
                              roomId: room.id,
                              playerId: session.player.id,
                            }),
                          ),
                        )
                        return [model, Array.getSomes([startGameRequested])]
                      },
                      onNone: () => [model, []],
                    }),
                  ),
                  M.orElse(() => [model, []]),
                ),
              ),
              M.orElse(() => [model, []]),
            ),
          ),
          M.orElse(() =>
            M.value(model.homeStep).pipe(
              withUpdateReturn,
              M.tag('SelectAction', ({ username, selectedAction }) => {
                const cycleAction = (offset: number) => {
                  const homeActionsLength = Array.length(HOME_ACTIONS)

                  return pipe(
                    HOME_ACTIONS,
                    Array.findFirstIndex((action) => action === selectedAction),
                    Option.map(
                      flow(
                        Number.sum(offset),
                        Number.remainder(homeActionsLength),
                        (remainder) => (remainder < 0 ? remainder + homeActionsLength : remainder),
                        (nextIndex) => Array.unsafeGet(HOME_ACTIONS, nextIndex),
                      ),
                    ),
                    Option.getOrThrow,
                  )
                }

                return M.value(key).pipe(
                  withUpdateReturn,
                  M.when('ArrowUp', () => [
                    evo(model, {
                      homeStep: () =>
                        SelectAction.make({ username, selectedAction: cycleAction(-1) }),
                    }),
                    [],
                  ]),
                  M.when('ArrowDown', () => [
                    evo(model, {
                      homeStep: () =>
                        SelectAction.make({ username, selectedAction: cycleAction(1) }),
                    }),
                    [],
                  ]),
                  M.when('Enter', () => {
                    return M.value(selectedAction).pipe(
                      withUpdateReturn,
                      M.when('CreateRoom', () => [
                        model,
                        [Effect.succeed(CreateRoomClicked.make())],
                      ]),
                      M.when('JoinRoom', () => [
                        evo(model, {
                          homeStep: () =>
                            EnterRoomId.make({
                              username,
                              roomId: '',
                              roomIdValidationId: 0,
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
                  }),
                  M.orElse(() => [model, []]),
                )
              }),
              M.orElse(() => [model, []]),
            ),
          ),
        ),

      LinkClicked: ({ request }) =>
        M.value(request).pipe(
          withUpdateReturn,
          M.tagsExhaustive({
            Internal: ({ url }) => [
              model,
              [pushUrl(Url.toString(url)).pipe(Effect.as(NoOp.make()))],
            ],
            External: ({ href }) => [model, [load(href).pipe(Effect.as(NoOp.make()))]],
          }),
        ),

      UrlChanged: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      UsernameInputted: ({ value }) =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterUsername', () => [
            evo(model, {
              homeStep: () => EnterUsername.make({ username: value }),
              roomFormError: () => Option.none(),
            }),
            [],
          ]),
          M.orElse(() => [model, []]),
        ),

      UsernameInputBlurred: () => [model, [Task.focus(`#${USERNAME_INPUT_ID}`, () => NoOp.make())]],

      RoomIdInputBlurred: () => [model, [Task.focus(`#${ROOM_ID_INPUT_ID}`, () => NoOp.make())]],

      RoomPageUsernameInputBlurred: () => [
        model,
        [Task.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`, () => NoOp.make())],
      ],

      RoomIdInputted: ({ value }) =>
        M.value(model.homeStep).pipe(
          withUpdateReturn,
          M.tag('EnterRoomId', ({ username, roomIdValidationId }) => [
            evo(model, {
              homeStep: () =>
                EnterRoomId.make({
                  username,
                  roomId: value,
                  roomIdValidationId,
                }),
              roomFormError: () => Option.none(),
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
            if (Str.isNonEmpty(roomId)) {
              return [model, [joinRoom(username, roomId)]]
            }
            return [model, []]
          }),
          M.orElse(() => [model, []]),
        ),

      RoomCreated: ({ roomId, player }) => {
        const session = { roomId, player }
        return [
          evo(model, {
            maybeSession: () => Option.some(session),
          }),
          [navigateToRoom(roomId), savePlayerToSessionStorage(session)],
        ]
      },

      RoomJoined: ({ roomId, player }) => {
        const session = { roomId, player }
        return [
          evo(model, {
            maybeSession: () => Option.some(session),
          }),
          [navigateToRoom(roomId), savePlayerToSessionStorage(session)],
        ]
      },

      RoomError: ({ error }) => [
        evo(model, {
          roomFormError: () => Option.some(error),
        }),
        [],
      ],

      RoomUpdated: handleRoomUpdated(model),

      RoomStreamError: ({ error: _error }) => {
        // TODO: ADd handling here
        return [model, []]
      },

      StartGameRequested: ({ roomId, playerId }) => [model, [startGame(roomId, playerId)]],

      SessionLoaded: ({ maybeSession }) => [
        evo(model, {
          maybeSession: () => maybeSession,
        }),
        [],
      ],

      UserTextInputted: ({ value }) => {
        const maybeRoom = M.value(model.roomRemoteData).pipe(
          M.tag('Ok', ({ data }) => data),
          M.option,
        )

        const maybeGameText = pipe(
          maybeRoom,
          Option.flatMap(({ maybeGame }) => maybeGame),
          Option.map(({ text }) => text),
        )

        const userText = validateUserTextInput(value, maybeGameText)

        const newCharsTyped = pipe(Str.length(userText) - Str.length(model.userText), Number.max(0))
        const nextCharsTyped = model.charsTyped + newCharsTyped

        const commands = pipe(
          Option.all([model.maybeSession, Option.flatMap(maybeRoom, ({ maybeGame }) => maybeGame)]),
          Option.map(([session, game]) =>
            updatePlayerProgress(session.player.id, game.id, userText, nextCharsTyped),
          ),
        )

        return [
          evo(model, {
            userText: () => userText,
            charsTyped: () => nextCharsTyped,
          }),
          Array.fromOption(commands),
        ]
      },

      RoomFetched: ({ room }) => {
        const maybeFocusRoomUsernameInput = Option.match(model.maybeSession, {
          onNone: () =>
            Option.some(Task.focus(`#${ROOM_PAGE_USERNAME_INPUT_ID}`, () => NoOp.make())),
          onSome: () => Option.none(),
        })

        return [
          evo(model, {
            roomRemoteData: () => RoomRemoteData.Ok.make({ data: room }),
          }),
          Array.getSomes([maybeFocusRoomUsernameInput]),
        ]
      },

      RoomNotFound: () => [
        evo(model, {
          roomRemoteData: () => RoomRemoteData.Error.make({ error: 'Room not found' }),
        }),
        [],
      ],

      RoomPageUsernameInputted: ({ value }) => [
        evo(model, {
          roomPageUsername: () => value,
          roomFormError: () => Option.none(),
        }),
        [],
      ],

      JoinRoomFromPageSubmitted: ({ roomId }) => {
        if (Str.isNonEmpty(model.roomPageUsername)) {
          return [model, [joinRoom(model.roomPageUsername, roomId)]]
        }
        return [model, []]
      },
    }),
  )
