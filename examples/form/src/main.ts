import { Array, Duration, Effect, Match as M, Number, Random, Schema as S } from 'effect'
import { FieldValidation, Runtime } from 'foldkit'
import { Field, FieldSchema, Validation, validateField } from 'foldkit/fieldValidation'
import { Html, html } from 'foldkit/html'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

// MODEL

const NotSubmitted = ts('NotSubmitted')
const Submitting = ts('Submitting')
const SubmitSuccess = ts('SubmitSuccess', { message: S.String })
const SubmitError = ts('SubmitError', { error: S.String })

const Submission = S.Union(NotSubmitted, Submitting, SubmitSuccess, SubmitError)

type NotSubmitted = typeof NotSubmitted.Type
type Submitting = typeof Submitting.Type
type SubmitSuccess = typeof SubmitSuccess.Type
type SubmitError = typeof SubmitError.Type
type Submission = typeof Submission.Type

const Model = S.Struct({
  name: FieldSchema(S.String),
  email: FieldSchema(S.String),
  emailValidationId: S.Number,
  message: FieldSchema(S.String),
  submission: Submission,
})
type Model = typeof Model.Type

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

type NoOp = typeof NoOp.Type
type UpdateName = typeof UpdateName.Type
type UpdateEmail = typeof UpdateEmail.Type
type EmailValidated = typeof EmailValidated.Type
type UpdateMessage = typeof UpdateMessage.Type
type SubmitForm = typeof SubmitForm.Type
type FormSubmitted = typeof FormSubmitted.Type

type Message = typeof Message.Type

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

const nameValidations: ReadonlyArray<Validation<string>> = [
  FieldValidation.minLength(2, (min) => `Name must be at least ${min} characters`),
]

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const emailValidations: ReadonlyArray<Validation<string>> = [
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
        evo(model, {
          name: () => validateName(value),
        }),
        [],
      ],

      UpdateEmail: ({ value }) => {
        const validateEmailResult = validateEmail(value)
        const validationId = Number.increment(model.emailValidationId)

        if (Field.$is('Valid')(validateEmailResult)) {
          return [
            evo(model, {
              email: () => Field.Validating({ value }),
              emailValidationId: () => validationId,
            }),
            [validateEmailNotOnWaitlist(value, validationId)],
          ]
        } else {
          return [
            evo(model, {
              email: () => validateEmailResult,
              emailValidationId: () => validationId,
            }),
            [],
          ]
        }
      },

      EmailValidated: ({ validationId, field }) => {
        if (validationId === model.emailValidationId) {
          return [
            evo(model, {
              email: () => field,
            }),
            [],
          ]
        } else {
          return [model, []]
        }
      },

      UpdateMessage: ({ value }) => [
        evo(model, {
          message: () => Field.Valid({ value }),
        }),
        [],
      ],

      SubmitForm: () => {
        if (!isFormValid(model)) {
          return [model, []]
        }

        return [
          evo(model, {
            submission: () => Submitting.make(),
          }),
          [submitForm(model)],
        ]
      },

      FormSubmitted: ({ success, name }) => {
        if (success) {
          return [
            evo(model, {
              submission: () =>
                SubmitSuccess.make({
                  message: `Welcome to the waitlist, ${name}! We'll be in touch soon.`,
                }),
            }),
            [],
          ]
        } else {
          return [
            evo(model, {
              submission: () =>
                SubmitError.make({
                  error: 'Sorry, there was an error adding you to the waitlist. Please try again.',
                }),
            }),
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

const h = html<Message>()

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

  return h.div(
    [h.Class('mb-4')],
    [
      h.div(
        [h.Class('flex items-center gap-2 mb-2')],
        [
          h.label([h.For(id), h.Class('text-sm font-medium text-gray-700')], [labelText]),
          Field.$match(field, {
            NotValidated: () => h.empty,
            Validating: () => h.span([h.Class('text-blue-600 text-sm animate-spin')], ['◐']),
            Valid: () => h.span([h.Class('text-green-600 text-sm')], ['✓']),
            Invalid: () => h.empty,
          }),
        ],
      ),
      type === 'textarea'
        ? h.textarea([h.Id(id), h.Value(value), h.Class(inputClass), h.OnInput(onUpdate)])
        : h.input([
            h.Id(id),
            h.Type(type),
            h.Value(value),
            h.Class(inputClass),
            h.OnInput(onUpdate),
          ]),

      Field.$match(field, {
        NotValidated: () => h.empty,
        Validating: () => h.div([h.Class('text-blue-600 text-sm mt-1')], ['Checking...']),
        Valid: () => h.empty,
        Invalid: ({ error }) => h.div([h.Class('text-red-600 text-sm mt-1')], [error]),
      }),
    ],
  )
}

const view = (model: Model): Html => {
  const canSubmit = isFormValid(model) && model.submission._tag !== 'Submitting'

  return h.div(
    [h.Class('min-h-screen bg-gray-100 py-8')],
    [
      h.div(
        [h.Class('max-w-md mx-auto bg-white rounded-xl shadow-lg p-6')],
        [
          h.h1(
            [h.Class('text-3xl font-bold text-gray-800 text-center mb-8')],
            ['Join Our Waitlist'],
          ),

          h.form(
            [h.Class('space-y-4'), h.OnSubmit(SubmitForm.make())],
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

              h.button(
                [
                  h.Type('submit'),
                  h.Disabled(!canSubmit),
                  h.Class(
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
              NotSubmitted: () => h.empty,
              Submitting: () => h.empty,
              SubmitSuccess: ({ message }) =>
                h.div(
                  [
                    h.Class(
                      'mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg',
                    ),
                  ],
                  [message],
                ),
              SubmitError: ({ error }) =>
                h.div(
                  [h.Class('mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg')],
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
