import classNames from 'classnames'
import {
  Array,
  Duration,
  Effect,
  Match as M,
  Option,
  Schema as S,
  String,
  pipe,
} from 'effect'
import { FieldValidation, Runtime } from 'foldkit'
import {
  type Validation,
  makeField,
  validateField,
} from 'foldkit/fieldValidation'
import { Html } from 'foldkit/html'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

import { Session } from '../../../domain/session'
import {
  Class,
  Disabled,
  For,
  Href,
  Id,
  OnInput,
  OnSubmit,
  Placeholder,
  Type,
  Value,
  a,
  button,
  div,
  empty,
  form,
  h1,
  input,
  label,
  p,
  span,
} from '../../../html'
import type { Message as ParentMessage } from '../../../message'
import { homeRouter } from '../../../route'

// FIELD

const StringField = makeField(S.String)
type StringField = typeof StringField.Union.Type

const StringFieldValid = StringField.Valid
const StringFieldInvalid = StringField.Invalid

// MODEL

export const Model = S.Struct({
  email: StringField.Union,
  password: StringField.Union,
  isSubmitting: S.Boolean,
})

export type Model = typeof Model.Type

export const initModel = (): Model => ({
  email: StringField.NotValidated.make({ value: '' }),
  password: StringField.NotValidated.make({ value: '' }),
  isSubmitting: false,
})

// MESSAGE

const EmailChanged = ts('EmailChanged', { value: S.String })
const PasswordChanged = ts('PasswordChanged', { value: S.String })
const SubmitClicked = ts('SubmitClicked')
const AuthSucceeded = ts('AuthSucceeded', { session: Session })
const AuthFailed = ts('AuthFailed', { error: S.String })

export const Message = S.Union(
  EmailChanged,
  PasswordChanged,
  SubmitClicked,
  AuthSucceeded,
  AuthFailed,
)

export type EmailChanged = typeof EmailChanged.Type
export type PasswordChanged = typeof PasswordChanged.Type
export type SubmitClicked = typeof SubmitClicked.Type
export type AuthSucceeded = typeof AuthSucceeded.Type
export type AuthFailed = typeof AuthFailed.Type
export type Message = typeof Message.Type

// OUT MESSAGE

export const LoginSucceeded = ts('LoginSucceeded', { session: Session })
export const OutMessage = S.Union(LoginSucceeded)

export type LoginSucceeded = typeof LoginSucceeded.Type
export type OutMessage = typeof OutMessage.Type

// VALIDATION

const emailValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Email is required'),
  FieldValidation.email('Please enter a valid email'),
]

const passwordValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.required('Password is required'),
]

const validateEmail = validateField(emailValidations)
const validatePassword = validateField(passwordValidations)

const isFormValid = (model: Model): boolean =>
  Array.every([model.email, model.password], S.is(StringFieldValid))

// UPDATE

type UpdateReturn = [
  Model,
  ReadonlyArray<Runtime.Command<Message>>,
  Option.Option<OutMessage>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const simulateAuthRequest = (
  email: string,
  password: string,
): Runtime.Command<Message> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.seconds(1))

    if (password !== 'password') {
      return AuthFailed.make({ error: 'Invalid credentials' })
    }

    const name = pipe(
      email,
      String.split('@'),
      Array.head,
      Option.getOrElse(() => email),
    )

    const session: Session = { userId: '1', email, name }

    return AuthSucceeded.make({ session })
  })

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      EmailChanged: ({ value }) => [
        evo(model, { email: () => validateEmail(value) }),
        [],
        Option.none(),
      ],

      PasswordChanged: ({ value }) => [
        evo(model, { password: () => validatePassword(value) }),
        [],
        Option.none(),
      ],

      SubmitClicked: () => {
        if (!isFormValid(model)) {
          return [model, [], Option.none()]
        }

        return [
          evo(model, { isSubmitting: () => true }),
          [simulateAuthRequest(model.email.value, model.password.value)],
          Option.none(),
        ]
      },

      AuthSucceeded: ({ session }) => [
        model,
        [],
        Option.some(LoginSucceeded.make({ session })),
      ],

      AuthFailed: ({ error }) => [
        evo(model, {
          password: () =>
            StringFieldInvalid.make({ value: model.password.value, error }),
          isSubmitting: () => false,
        }),
        [],
        Option.none(),
      ],
    }),
  )

// VIEW

const fieldToBorderClass = (field: StringField) =>
  M.value(field).pipe(
    M.tagsExhaustive({
      NotValidated: () => 'border-gray-300',
      Validating: () => 'border-blue-300',
      Valid: () => 'border-green-500',
      Invalid: () => 'border-red-500',
    }),
  )

const fieldView = (
  id: string,
  labelText: string,
  field: StringField,
  onUpdate: (value: string) => ParentMessage,
  type: 'text' | 'email' | 'password' = 'text',
  placeholder = '',
): Html => {
  const inputClass = classNames(
    'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
    fieldToBorderClass(field),
  )

  return div(
    [],
    [
      div(
        [Class('flex items-center gap-2 mb-1')],
        [
          label(
            [For(id), Class('block text-sm font-medium text-gray-700')],
            [labelText],
          ),
          M.value(field).pipe(
            M.tagsExhaustive({
              NotValidated: () => empty,
              Validating: () => span([Class('text-blue-600 text-sm')], ['...']),
              Valid: () => span([Class('text-green-600 text-sm')], ['✓']),
              Invalid: () => empty,
            }),
          ),
        ],
      ),
      input([
        Id(id),
        Type(type),
        Value(field.value),
        Placeholder(placeholder),
        Class(inputClass),
        OnInput(onUpdate),
      ]),
      M.value(field).pipe(
        M.tagsExhaustive({
          NotValidated: () => empty,
          Validating: () => empty,
          Valid: () => empty,
          Invalid: ({ error }) =>
            div([Class('text-red-600 text-sm mt-1')], [error]),
        }),
      ),
    ],
  )
}

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const canSubmit = isFormValid(model) && !model.isSubmitting

  return div(
    [Class('max-w-md mx-auto px-4')],
    [
      div(
        [Class('bg-white rounded-xl shadow-lg p-8')],
        [
          h1(
            [Class('text-3xl font-bold text-gray-800 text-center mb-8')],
            ['Sign In'],
          ),
          div(
            [Class('mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg')],
            [
              p(
                [Class('text-sm text-blue-700')],
                ['Hint: Use any email with password "password"'],
              ),
            ],
          ),
          form(
            [Class('space-y-6'), OnSubmit(toMessage(SubmitClicked.make()))],
            [
              fieldView(
                'email',
                'Email',
                model.email,
                (value) => toMessage(EmailChanged.make({ value })),
                'email',
                'you@example.com',
              ),
              fieldView(
                'password',
                'Password',
                model.password,
                (value) => toMessage(PasswordChanged.make({ value })),
                'password',
                'Enter your password',
              ),
              button(
                [
                  Type('submit'),
                  Disabled(!canSubmit),
                  Class(
                    classNames(
                      'w-full py-3 font-medium rounded-lg transition',
                      canSubmit
                        ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed',
                    ),
                  ),
                ],
                [model.isSubmitting ? 'Signing in...' : 'Sign In'],
              ),
            ],
          ),
          div(
            [Class('mt-6 text-center')],
            [
              span([Class('text-gray-600')], ['Back to ']),
              a(
                [
                  Href(homeRouter.build({})),
                  Class('text-blue-500 hover:underline'),
                ],
                ['Home'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
