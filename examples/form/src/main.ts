import { Array, Duration, Effect, Match as M, Number, Random, Schema as S } from 'effect'
import { FieldValidation, Runtime } from 'foldkit'
import { Field, FieldSchema, Validation, validateField } from 'foldkit/fieldValidation'
import {
  Class,
  Disabled,
  For,
  Html,
  Id,
  OnInput,
  OnSubmit,
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
import { ST, ts } from 'foldkit/schema'

// MODEL

const NotSubmitted = ts('NotSubmitted')
const Submitting = ts('Submitting')
const SubmitSuccess = ts('SubmitSuccess', { message: S.String })
const SubmitError = ts('SubmitError', { error: S.String })

const Submission = S.Union(NotSubmitted, Submitting, SubmitSuccess, SubmitError)

type NotSubmitted = ST<typeof NotSubmitted>
type Submitting = ST<typeof Submitting>
type SubmitSuccess = ST<typeof SubmitSuccess>
type SubmitError = ST<typeof SubmitError>
type Submission = ST<typeof Submission>

const Model = S.Struct({
  name: FieldSchema(S.String),
  email: FieldSchema(S.String),
  emailValidationId: S.Number,
  message: FieldSchema(S.String),
  submission: Submission,
})
type Model = ST<typeof Model>

// MESSAGE

const NoOp = ts('NoOp')
const UpdateName = ts('UpdateName', { value: S.String })
const UpdateEmail = ts('UpdateEmail', { value: S.String })
const EmailValidated = ts('EmailValidated', {
  validationId: S.Number,
  field: FieldSchema(S.String),
})
const UpdateMessage = ts('UpdateMessage', { value: S.String })
const SubmitForm = ts('SubmitForm')
const FormSubmitted = ts('FormSubmitted', {
  success: S.Boolean,
  name: S.String,
  email: S.String,
  message: S.String,
})

const Message = S.Union(
  NoOp,
  UpdateName,
  UpdateEmail,
  EmailValidated,
  UpdateMessage,
  SubmitForm,
  FormSubmitted,
)

type NoOp = ST<typeof NoOp>
type UpdateName = ST<typeof UpdateName>
type UpdateEmail = ST<typeof UpdateEmail>
type EmailValidated = ST<typeof EmailValidated>
type UpdateMessage = ST<typeof UpdateMessage>
type SubmitForm = ST<typeof SubmitForm>
type FormSubmitted = ST<typeof FormSubmitted>

type Message = ST<typeof Message>

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    name: Field.NotValidated({ value: '' }),
    email: Field.NotValidated({ value: '' }),
    emailValidationId: 0,
    message: Field.NotValidated({ value: '' }),
    submission: NotSubmitted.make(),
  },
  [],
]

// FIELD VALIDATION

const nameValidations: Validation<string>[] = [
  FieldValidation.minLength(2, (min) => `Name must be at least ${min} characters`),
]

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailValidations: Validation<string>[] = [
  FieldValidation.required('Email'),
  FieldValidation.regex(emailRegex, 'Please enter a valid email address'),
]

const EMAILS_ON_WAITLIST = ['test@example.com', 'demo@email.com', 'admin@test.com']

const isEmailOnWaitlist = (email: string): Effect.Effect<boolean> =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(FAKE_API_DELAY_MS))
    return Array.contains(EMAILS_ON_WAITLIST, email.toLowerCase())
  })

const validateEmailNotOnWaitlist = (
  email: string,
  validationId: number,
): Runtime.Command<EmailValidated> =>
  Effect.gen(function* () {
    if (yield* isEmailOnWaitlist(email)) {
      return EmailValidated.make({
        validationId,
        field: Field.Invalid({
          value: email,
          error: 'This email is already on our waitlist',
        }),
      })
    } else {
      return EmailValidated.make({
        validationId,
        field: Field.Valid({ value: email }),
      })
    }
  })

const validateName = validateField(nameValidations)
const validateEmail = validateField(emailValidations)

const isFormValid = (model: Model): boolean =>
  Array.every([model.name, model.email], Field.$is('Valid'))

// UPDATE

const update = (model: Model, message: Message): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      UpdateName: ({ value }) => [
        {
          ...model,
          name: validateName(value),
        },
        [],
      ],

      UpdateEmail: ({ value }) => {
        const validateEmailResult = validateEmail(value)
        const validationId = Number.increment(model.emailValidationId)

        if (Field.$is('Valid')(validateEmailResult)) {
          return [
            {
              ...model,
              email: Field.Validating({ value }),
              emailValidationId: validationId,
            },
            [validateEmailNotOnWaitlist(value, validationId)],
          ]
        } else {
          return [{ ...model, email: validateEmailResult, emailValidationId: validationId }, []]
        }
      },

      EmailValidated: ({ validationId, field }) => {
        if (validationId === model.emailValidationId) {
          return [{ ...model, email: field }, []]
        } else {
          return [model, []]
        }
      },

      UpdateMessage: ({ value }) => [
        {
          ...model,
          message: Field.Valid({ value }),
        },
        [],
      ],

      SubmitForm: () => {
        if (!isFormValid(model)) {
          return [model, []]
        }

        return [
          {
            ...model,
            submission: Submitting.make(),
          },
          [submitForm(model)],
        ]
      },

      FormSubmitted: ({ success, name }) => {
        if (success) {
          return [
            {
              ...model,
              submission: SubmitSuccess.make({
                message: `Welcome to the waitlist, ${name}! We'll be in touch soon.`,
              }),
            },
            [],
          ]
        } else {
          return [
            {
              ...model,
              submission: SubmitError.make({
                error: 'Sorry, there was an error adding you to the waitlist. Please try again.',
              }),
            },
            [],
          ]
        }
      },
    }),
  )

// COMMAND

const FAKE_API_DELAY_MS = 500

const submitForm = (model: Model): Runtime.Command<FormSubmitted> =>
  Effect.gen(function* () {
    yield* Effect.sleep(`${FAKE_API_DELAY_MS} millis`)

    const success = yield* Random.nextBoolean

    return FormSubmitted.make({
      success,
      name: model.name.value,
      email: model.name.value,
      message: model.message.value,
    })
  })

// VIEW

const fieldView = (
  id: string,
  labelText: string,
  field: Field<string>,
  onUpdate: (value: string) => Message,
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
        ? textarea([Id(id), Value(value), Class(inputClass), OnInput(onUpdate)])
        : input([Id(id), Type(type), Value(value), Class(inputClass), OnInput(onUpdate)]),

      Field.$match(field, {
        NotValidated: () => empty,
        Validating: () => div([Class('text-blue-600 text-sm mt-1')], ['Checking...']),
        Valid: () => empty,
        Invalid: ({ error }) => div([Class('text-red-600 text-sm mt-1')], [error]),
      }),
    ],
  )
}

const view = (model: Model): Html => {
  const canSubmit = isFormValid(model) && model.submission._tag !== 'Submitting'

  return div(
    [Class('min-h-screen bg-gray-100 py-8')],
    [
      div(
        [Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h1([Class('text-3xl font-bold text-gray-800 text-center mb-8')], ['Join Our Waitlist']),

          form(
            [Class('space-y-4'), OnSubmit(SubmitForm.make())],
            [
              fieldView('name', 'Name', model.name, (value) => UpdateName.make({ value })),
              fieldView(
                'email',
                'Email',
                model.email,
                (value) => UpdateEmail.make({ value }),
                'email',
              ),
              fieldView(
                'message',
                "Anything you'd like to share with us?",
                model.message,
                (value) => UpdateMessage.make({ value }),
                'textarea',
              ),

              button(
                [
                  Type('submit'),
                  Disabled(!canSubmit),
                  Class(
                    `w-full py-2 px-4 rounded-md transition ${
                      canSubmit
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`,
                  ),
                ],
                [model.submission._tag === 'Submitting' ? 'Joining...' : 'Join Waitlist'],
              ),
            ],
          ),

          M.value(model.submission).pipe(
            M.tagsExhaustive({
              NotSubmitted: () => empty,
              Submitting: () => empty,
              SubmitSuccess: ({ message }) =>
                div(
                  [
                    Class(
                      'mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg',
                    ),
                  ],
                  [message],
                ),
              SubmitError: ({ error }) =>
                div(
                  [Class('mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg')],
                  [error],
                ),
            }),
          ),
        ],
      ),
    ],
  )
}

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
})

Runtime.run(element)
