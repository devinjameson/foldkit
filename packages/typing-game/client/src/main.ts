import * as Shared from '@typing-game/shared'
import classNames from 'classnames'
import {
  Array,
  Effect,
  Match as M,
  Number,
  Option,
  Schema as S,
  Stream,
  Struct,
  pipe,
} from 'effect'
import { FieldValidation, Route, Runtime, Url } from 'foldkit'
import { Field, FieldSchema, Validation, validateField } from 'foldkit/fieldValidation'
import {
  Class,
  Disabled,
  For,
  Href,
  Html,
  Id,
  OnClick,
  OnInput,
  Type,
  Value,
  a,
  button,
  div,
  empty,
  form,
  h1,
  h2,
  input,
  label,
  span,
  textarea,
} from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { literal, slash, string } from 'foldkit/route'
import { ts } from 'foldkit/schema'

import { RoomsClient } from './rpc'

// ROUTE

const HomeRoute = ts('Home')
const RoomRoute = ts('Room', { roomId: S.String })
const NotFoundRoute = ts('NotFound', { path: S.String })

const AppRoute = S.Union(HomeRoute, RoomRoute, NotFoundRoute)

type HomeRoute = typeof HomeRoute.Type
type RoomRoute = typeof RoomRoute.Type
type NotFoundRoute = typeof NotFoundRoute.Type

type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
const roomRouter = pipe(literal('room'), slash(string('roomId')), Route.mapTo(RoomRoute))
const routeParser = Route.oneOf(roomRouter, homeRouter)

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// MODEL

const Model = S.Struct({
  route: AppRoute,
  usernameInput: FieldSchema(S.String),
  roomIdInput: FieldSchema(S.String),
  roomIdValidationId: S.Number,
  maybeRoom: S.Option(Shared.Room),
  error: S.Option(S.String),
})
type Model = typeof Model.Type

// MESSAGE

const NoOp = ts('NoOp')
const LinkClicked = ts('LinkClicked', {
  request: Runtime.UrlRequest,
})
const UrlChanged = ts('UrlChanged', { url: Url.Url })
const UpdateUsername = ts('UpdateUsername', { value: S.String })
const UpdateRoomId = ts('UpdateRoomId', { value: S.String })
const RoomIdValidated = ts('RoomIdValidated', {
  validationId: S.Number,
  field: FieldSchema(S.String),
})
const CreateRoomClicked = ts('CreateRoomClicked')
const JoinRoomClicked = ts('JoinRoomClicked')
const RoomCreated = ts('RoomCreated', { roomId: S.String })
const RoomJoined = ts('RoomJoined', { roomId: S.String })
const RoomError = ts('RoomError', { error: S.String })
const RoomUpdated = ts('RoomUpdated', { room: Shared.Room })
const RoomStreamError = ts('RoomStreamError', { error: S.String })

type NoOp = typeof NoOp.Type
type LinkClicked = typeof LinkClicked.Type
type UrlChanged = typeof UrlChanged.Type
type UpdateUsername = typeof UpdateUsername.Type
type UpdateRoomId = typeof UpdateRoomId.Type
type RoomIdValidated = typeof RoomIdValidated.Type
type CreateRoomClicked = typeof CreateRoomClicked.Type
type JoinRoomClicked = typeof JoinRoomClicked.Type
type RoomCreated = typeof RoomCreated.Type
type RoomJoined = typeof RoomJoined.Type
type RoomError = typeof RoomError.Type
type RoomUpdated = typeof RoomUpdated.Type
type RoomStreamError = typeof RoomStreamError.Type

const Message = S.Union(
  NoOp,
  LinkClicked,
  UrlChanged,
  UpdateUsername,
  UpdateRoomId,
  RoomIdValidated,
  CreateRoomClicked,
  JoinRoomClicked,
  RoomCreated,
  RoomJoined,
  RoomError,
  RoomUpdated,
  RoomStreamError,
)
type Message = typeof Message.Type

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url.Url) => [
  {
    route: urlToAppRoute(url),
    usernameInput: Field.NotValidated({ value: '' }),
    roomIdInput: Field.NotValidated({ value: '' }),
    roomIdValidationId: 0,
    maybeRoom: Option.none(),
    error: Option.none(),
  },
  [],
]

// FIELD VALIDATION

const usernameValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Username'),
  FieldValidation.minLength(2, (min) => `Username must be at least ${min} characters`),
]

const roomIdValidations: ReadonlyArray<Validation<string>> = [FieldValidation.required('Room ID')]

const isEveryFieldValid = (fields: ReadonlyArray<Field<unknown>>): boolean =>
  Array.every(fields, Field.$is('Valid'))

const isAnyFieldNotValid = (fields: ReadonlyArray<Field<unknown>>): boolean =>
  Array.some(fields, (field) => !Field.$is('Valid')(field))

// UPDATE

const update = (model: Model, message: Message): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      LinkClicked: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({ url }): [Model, ReadonlyArray<Runtime.Command<NoOp>>] => [
              model,
              [pushUrl(Url.toString(url)).pipe(Effect.as(NoOp.make()))],
            ],
            External: ({ href }): [Model, ReadonlyArray<Runtime.Command<NoOp>>] => [
              model,
              [load(href).pipe(Effect.as(NoOp.make()))],
            ],
          }),
        ),

      UrlChanged: ({ url }) => [
        Struct.evolve(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      UpdateUsername: ({ value }) => [
        Struct.evolve(model, {
          usernameInput: () => validateField(usernameValidations)(value),
          error: () => Option.none(),
        }),
        [],
      ],

      UpdateRoomId: ({ value }) => {
        const validateRoomIdResult = validateField(roomIdValidations)(value)
        const validationId = Number.increment(model.roomIdValidationId)

        if (Field.$is('Valid')(validateRoomIdResult)) {
          return [
            Struct.evolve(model, {
              roomIdValidationId: () => validationId,
              error: () => Option.none(),
            }),
            [validateRoomJoinable(value, validationId)],
          ]
        } else {
          return [
            Struct.evolve(model, {
              roomIdInput: () => validateRoomIdResult,
              roomIdValidationId: () => validationId,
              error: () => Option.none(),
            }),
            [],
          ]
        }
      },

      RoomIdValidated: ({ validationId, field }) => {
        if (validationId === model.roomIdValidationId) {
          return [
            Struct.evolve(model, {
              roomIdInput: () => field,
            }),
            [],
          ]
        } else {
          return [model, []]
        }
      },

      CreateRoomClicked: () => {
        if (isAnyFieldNotValid([model.usernameInput])) {
          return [model, []]
        }

        return [model, [createRoom(model.usernameInput.value)]]
      },

      JoinRoomClicked: () => {
        if (isAnyFieldNotValid([model.usernameInput, model.roomIdInput])) {
          return [model, []]
        }

        return [model, [joinRoom(model.usernameInput.value, model.roomIdInput.value)]]
      },

      RoomCreated: ({ roomId }) => [model, [navigateToRoom(roomId)]],

      RoomJoined: ({ roomId }) => [model, [navigateToRoom(roomId)]],

      RoomError: ({ error }) => [
        Struct.evolve(model, {
          error: () => Option.some(error),
        }),
        [],
      ],

      RoomUpdated: ({ room }) => [
        Struct.evolve(model, {
          maybeRoom: () => Option.some(room),
        }),
        [],
      ],

      // TODO: We need to show an error message if the room stream errors, and ideally
      // we can make this error the actual possible errors that can happen in
      // the stream (right now just room not found)
      RoomStreamError: ({ error }) => {
        console.error('Room stream error:', error)
        return [model, []]
      },
    }),
  )

// COMMAND

const validateRoomJoinable = (
  roomId: string,
  validationId: number,
): Runtime.Command<RoomIdValidated> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    return yield* client.getRoomById({ roomId })
  }).pipe(
    Effect.match({
      onSuccess: () =>
        RoomIdValidated.make({
          validationId,
          field: Field.Valid({ value: roomId }),
        }),
      onFailure: () =>
        RoomIdValidated.make({
          validationId,
          field: Field.Invalid({
            value: roomId,
            error: 'Room not found',
          }),
        }),
    }),
    Effect.provide(RoomsClient.Default),
  )

const createRoom = (username: string): Runtime.Command<RoomCreated | RoomError> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const room = yield* client.createRoom({ username })
    return RoomCreated.make({ roomId: room.id })
  }).pipe(
    Effect.catchAll((error) => Effect.succeed(RoomError.make({ error: String(error) }))),
    Effect.provide(RoomsClient.Default),
  )

const joinRoom = (username: string, roomId: string): Runtime.Command<RoomJoined | RoomError> =>
  Effect.gen(function* () {
    const client = yield* RoomsClient
    const room = yield* client.joinRoom({ username, roomId })
    return RoomJoined.make({ roomId: room.id })
  }).pipe(
    Effect.catchAll((error) => Effect.succeed(RoomError.make({ error: String(error) }))),
    Effect.provide(RoomsClient.Default),
  )

const navigateToRoom = (roomId: string): Runtime.Command<NoOp> =>
  pushUrl(roomRouter.build({ roomId })).pipe(Effect.as(NoOp.make()))

// COMMAND STREAM

const CommandStreamsDeps = S.Struct({
  roomId: S.Option(S.String),
})

const commandStreams = Runtime.makeCommandStreams(CommandStreamsDeps)<Model, Message>({
  roomId: {
    modelToDeps: (model: Model) =>
      M.value(model.route).pipe(
        M.tag('Room', ({ roomId }) => roomId),
        M.option,
      ),
    depsToStream: (maybeRoomId: Option.Option<string>) =>
      Option.match(maybeRoomId, {
        onNone: () => Stream.empty,
        onSome: (roomId: string) =>
          Effect.gen(function* () {
            const client = yield* RoomsClient
            return client.subscribeToRoom({ roomId }).pipe(
              Stream.map((room) => Effect.succeed(RoomUpdated.make({ room }))),
              Stream.catchAll((error) =>
                Stream.make(Effect.succeed(RoomStreamError.make({ error: String(error) }))),
              ),
            )
          }).pipe(Stream.unwrap, Stream.provideLayer(RoomsClient.Default)),
      }),
  },
})

// VIEW

const fieldView = (params: {
  id: string
  labelText: string
  field: Field<string>
  onInput: (value: string) => Message
  type?: 'text' | 'email' | 'textarea'
  containerClassName?: string
}): Html => {
  const { id, labelText, field, onInput, type = 'text', containerClassName } = params
  const { value } = field

  const getBorderClass = () =>
    Field.$match(field, {
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-blue-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    })

  const inputClass = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getBorderClass()}`

  return div(
    [Class(classNames('mb-4', containerClassName))],
    [
      div(
        [Class('flex items-center gap-2 mb-2')],
        [
          label([For(id), Class('text-sm font-medium text-gray-700')], [labelText]),
          Field.$match(field, {
            NotValidated: () => empty,
            Validating: () => empty,
            Valid: () => span([Class('text-green-600 text-sm')], ['✓']),
            Invalid: () => empty,
          }),
        ],
      ),
      type === 'textarea'
        ? textarea([Id(id), Value(value), Class(inputClass), OnInput(onInput)])
        : input([Id(id), Type(type), Value(value), Class(inputClass), OnInput(onInput)]),

      Field.$match(field, {
        NotValidated: () => div([Class('invisible')], ['Not validated']),
        Validating: () => div([Class('text-blue-600 text-sm mt-1')], ['Checking...']),
        Valid: () => div([Class('invisible')], ['Valid']),
        Invalid: ({ error }) => div([Class('text-red-600 text-sm mt-1')], [error]),
      }),
    ],
  )
}

const homeView = (model: Model): Html => {
  const canCreateRoom = isEveryFieldValid([model.usernameInput])
  const canJoinRoom = isEveryFieldValid([model.usernameInput, model.roomIdInput])

  return div(
    [Class('min-h-screen bg-gray-100 flex items-center justify-center p-4')],
    [
      div(
        [Class('bg-white rounded-lg p-8 max-w-4xl w-full')],
        [
          h1(
            [Class('text-3xl font-bold text-gray-800 mb-6 text-center max-w-lg mx-auto')],
            ["Welcome to Pastor Herickson's Miney Niney Tiny Type Town!"],
          ),

          form(
            [Class('space-y-6')],
            [
              fieldView({
                id: 'username',
                labelText: 'Username',
                field: model.usernameInput,
                onInput: (value) => UpdateUsername.make({ value }),
                containerClassName: 'max-w-md mx-auto',
              }),

              div(
                [Class('grid grid-cols-1 md:grid-cols-2 gap-8')],
                [
                  div(
                    [Class('space-y-4 flex flex-col items-center justify-center py-8')],
                    [
                      h2([Class('text-xl font-semibold text-gray-700')], ['Create a Room']),
                      button(
                        [
                          Type('button'),
                          Disabled(!canCreateRoom),
                          Class(
                            classNames('w-full py-2 px-4 rounded-md transition', {
                              'bg-blue-500 text-white hover:bg-blue-600': canCreateRoom,
                              'bg-gray-300 text-gray-500 cursor-not-allowed': !canCreateRoom,
                            }),
                          ),
                          OnClick(CreateRoomClicked.make()),
                        ],
                        ['Create Room'],
                      ),
                    ],
                  ),

                  div(
                    [
                      Class(
                        'space-y-4 md:border-l md:border-gray-300 md:pl-8 flex flex-col items-center justify-center py-8',
                      ),
                    ],
                    [
                      h2([Class('text-xl font-semibold text-gray-700')], ['Join a Room']),
                      fieldView({
                        id: 'roomId',
                        labelText: 'Room ID',
                        field: model.roomIdInput,
                        onInput: (value) => UpdateRoomId.make({ value }),
                        containerClassName: 'w-full',
                      }),
                      button(
                        [
                          Type('button'),
                          Disabled(!canJoinRoom),
                          Class(
                            classNames('w-full py-2 px-4 rounded-md transition', {
                              'bg-blue-500 text-white hover:bg-blue-600': canJoinRoom,
                              'bg-gray-300 text-gray-500 cursor-not-allowed': !canJoinRoom,
                            }),
                          ),
                          OnClick(JoinRoomClicked.make()),
                        ],
                        ['Join Room'],
                      ),
                    ],
                  ),
                ],
              ),
              Option.match(model.error, {
                onNone: () => empty,
                onSome: (errorMessage) =>
                  div(
                    [Class('mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-center')],
                    [span([Class('text-red-600')], [errorMessage])],
                  ),
              }),
            ],
          ),
        ],
      ),
    ],
  )
}

const maybeRoomView = (maybeRoom: Option.Option<Shared.Room>): Html =>
  Option.match(maybeRoom, {
    onNone: () => div([Class('text-gray-600')], ['Loading room...']),
    onSome: (room: Shared.Room) =>
      div(
        [],
        [
          h2([Class('text-xl font-semibold text-gray-700 mb-4')], ['Players']),
          div(
            [Class('space-y-2')],
            Array.map(room.players, (player) =>
              div(
                [Class('p-3 bg-gray-50 rounded border border-gray-200')],
                [span([Class('font-medium')], [player.username])],
              ),
            ),
          ),
        ],
      ),
  })

const roomRouteView = (model: Model, roomId: string): Html =>
  div(
    [Class('min-h-screen bg-gray-100 flex items-center justify-center p-4')],
    [
      div(
        [Class('bg-white rounded-lg p-8 max-w-4xl w-full')],
        [
          h1([Class('text-2xl font-bold text-gray-800 mb-6')], ['Room: ', roomId]),
          maybeRoomView(model.maybeRoom),
        ],
      ),
    ],
  )

const notFoundView = (path: string): Html =>
  div(
    [Class('min-h-screen bg-gray-100 flex items-center justify-center')],
    [
      div(
        [Class('bg-white rounded-lg p-8 text-center')],
        [
          h1([Class('text-2xl font-bold text-gray-800 mb-4')], ['404 - Page Not Found']),
          div([Class('text-gray-600 mb-4')], [`The path "${path}" does not exist.`]),
          a(
            [Href(homeRouter.build({})), Class('text-blue-500 hover:text-blue-700')],
            ['Go back to home'],
          ),
        ],
      ),
    ],
  )

const view = (model: Model): Html =>
  M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => homeView(model),
      Room: ({ roomId }) => roomRouteView(model, roomId),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

// RUN

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  commandStreams,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: (request) => LinkClicked.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(application)
