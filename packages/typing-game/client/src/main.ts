import classNames from 'classnames'
import { Array, Effect, Match as M, Number, Schema as S, pipe } from 'effect'
import { FieldValidation, Route, Runtime, Url } from 'foldkit'
import { Field, FieldSchema, Validation, validateField } from 'foldkit/fieldValidation'
import {
  Class,
  Disabled,
  For,
  Html,
  Id,
  OnClick,
  OnInput,
  Type,
  Value,
  button,
  div,
  empty,
  form,
  h1,
  input,
  label,
  span,
  textarea,
} from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { literal, slash, string } from 'foldkit/route'
import { ts } from 'foldkit/schema'

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
  username: FieldSchema(S.String),
  roomId: FieldSchema(S.String),
  roomIdValidationId: S.Number,
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

type NoOp = typeof NoOp.Type
type LinkClicked = typeof LinkClicked.Type
type UrlChanged = typeof UrlChanged.Type
type UpdateUsername = typeof UpdateUsername.Type
type UpdateRoomId = typeof UpdateRoomId.Type
type RoomIdValidated = typeof RoomIdValidated.Type
type CreateRoomClicked = typeof CreateRoomClicked.Type
type JoinRoomClicked = typeof JoinRoomClicked.Type

const Message = S.Union(
  NoOp,
  LinkClicked,
  UrlChanged,
  UpdateUsername,
  UpdateRoomId,
  RoomIdValidated,
  CreateRoomClicked,
  JoinRoomClicked,
)
type Message = typeof Message.Type

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url.Url) => [
  {
    route: urlToAppRoute(url),
    username: Field.NotValidated({ value: '' }),
    roomId: Field.NotValidated({ value: '' }),
    roomIdValidationId: 0,
  },
  [],
]

// FIELD VALIDATION

const usernameValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Username'),
  FieldValidation.minLength(2, (min) => `Username must be at least ${min} characters`),
]

const roomIdValidations: ReadonlyArray<Validation<string>> = [FieldValidation.required('Room ID')]

const validateRoomJoinable = (
  roomId: string,
  validationId: number,
): Runtime.Command<RoomIdValidated> =>
  Effect.gen(function* () {
    // Just succeed for now, needs real implementation
    return RoomIdValidated.make({
      validationId,
      field: Field.Valid({ value: roomId }),
    })

    // RPC call to check if room is joinable
    // Below is ewxample implementation from form example
    //
    // if (yield* isEmailOnWaitlist(email)) {
    //   return EmailValidated.make({
    //     validationId,
    //     field: Field.Invalid({
    //       value: email,
    //       error: 'This email is already on our waitlist',
    //     }),
    //   })
    // } else {
    //   return EmailValidated.make({
    //     validationId,
    //     field: Field.Valid({ value: email }),
    //   })
    // }
  })

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
        {
          ...model,
          route: urlToAppRoute(url),
        },
        [],
      ],

      UpdateUsername: ({ value }) => [
        {
          ...model,
          username: validateField(usernameValidations)(value),
        },
        [],
      ],

      UpdateRoomId: ({ value }) => {
        const validateRoomIdResult = validateField(roomIdValidations)(value)
        const validationId = Number.increment(model.roomIdValidationId)

        if (Field.$is('Valid')(validateRoomIdResult)) {
          return [
            {
              ...model,
              roomId: Field.Validating({ value }),
              roomIdValidationId: validationId,
            },
            [validateRoomJoinable(value, validationId)],
          ]
        } else {
          return [
            {
              ...model,
              roomId: validateRoomIdResult,
              roomIdValidationId: validationId,
            },
            [],
          ]
        }
      },

      RoomIdValidated: ({ validationId, field }) => {
        if (validationId === model.roomIdValidationId) {
          return [{ ...model, roomId: field }, []]
        } else {
          return [model, []]
        }
      },

      CreateRoomClicked: () => {
        // TODO: Implement room creation
        return [model, []]
      },

      JoinRoomClicked: () => {
        // TODO: Implement room joining
        return [model, []]
      },
    }),
  )

// VIEW

const fieldView = (
  id: string,
  labelText: string,
  field: Field<string>,
  onInput: (value: string) => Message,
  type: 'text' | 'email' | 'textarea' = 'text',
): Html => {
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
    [Class('mb-4')],
    [
      div(
        [Class('flex items-center gap-2 mb-2')],
        [
          label([For(id), Class('text-sm font-medium text-gray-700')], [labelText]),
          Field.$match(field, {
            NotValidated: () => empty,
            Validating: () => span([Class('text-blue-600 text-sm animate-spin')], ['◐']),
            Valid: () => span([Class('text-green-600 text-sm')], ['✓']),
            Invalid: () => empty,
          }),
        ],
      ),
      type === 'textarea'
        ? textarea([Id(id), Value(value), Class(inputClass), OnInput(onInput)])
        : input([Id(id), Type(type), Value(value), Class(inputClass), OnInput(onInput)]),

      Field.$match(field, {
        NotValidated: () => empty,
        Validating: () => div([Class('text-blue-600 text-sm mt-1')], ['Checking...']),
        Valid: () => empty,
        Invalid: ({ error }) => div([Class('text-red-600 text-sm mt-1')], [error]),
      }),
    ],
  )
}

const areFieldsValid = (fields: ReadonlyArray<Field<unknown>>): boolean =>
  Array.every(fields, Field.$is('Valid'))

const view = (model: Model): Html => {
  const canCreateRoom = areFieldsValid([model.username])
  const canJoinRoom = areFieldsValid([model.username, model.roomId])

  return div(
    [Class('min-h-screen bg-gray-100 flex items-center justify-center')],
    [
      div(
        [Class('bg-white rounded-lg shadow-lg p-8')],
        [
          h1([Class('text-3xl font-bold text-gray-800 mb-4')], ['Welcome to typing game!']),

          form(
            [Class('space-y-4')],
            [
              fieldView('username', 'Username', model.username, (value) =>
                UpdateUsername.make({ value }),
              ),

              div([Class('w-8 h-px bg-gray-300 mx-auto')], []),

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

              div([Class('uppercase mx-auto w-fit font-medium text-gray-500')], ['Or']),

              fieldView('roomId', 'Room ID', model.roomId, (value) => UpdateRoomId.make({ value })),

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
    ],
  )
}

// RUN

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: (request) => LinkClicked.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(application)
