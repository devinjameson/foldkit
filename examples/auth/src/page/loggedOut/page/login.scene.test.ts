import { Scene } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { describe, test } from 'vitest'

import {
  FailedSimulateAuthRequest,
  Model,
  SimulateAuthRequest,
  initModel,
  update,
  view,
} from './login'

const validModel = Model.make({
  ...initModel(),
  email: Valid({ value: 'alice@example.com' }),
  password: Valid({ value: 'password' }),
})

const heading = Scene.role('heading', { name: 'Sign In' })
const emailField = Scene.label('Email')
const passwordField = Scene.label('Password')
const submitButton = Scene.role('button', { name: 'Sign In' })
const submittingButton = Scene.role('button', { name: 'Signing in...' })

describe('login', () => {
  test('renders the heading, both fields, and the submit button', () => {
    Scene.scene(
      { update, view },
      Scene.with(initModel()),
      Scene.expect(heading).toExist(),
      Scene.expect(emailField).toExist(),
      Scene.expect(passwordField).toExist(),
      Scene.expect(submitButton).toExist(),
    )
  })

  test('submit button starts disabled', () => {
    Scene.scene(
      { update, view },
      Scene.with(initModel()),
      Scene.expect(submitButton).toBeDisabled(),
    )
  })

  test('typing a valid email shows the checkmark', () => {
    Scene.scene(
      { update, view },
      Scene.with(initModel()),
      Scene.type(emailField, 'alice@example.com'),
      Scene.expect(Scene.text('✓')).toExist(),
    )
  })

  test('typing an invalid email shows the error message', () => {
    Scene.scene(
      { update, view },
      Scene.with(initModel()),
      Scene.type(emailField, 'notanemail'),
      Scene.expect(Scene.text('Please enter a valid email')).toExist(),
    )
  })

  test('submit button is enabled after typing a valid email and password', () => {
    Scene.scene(
      { update, view },
      Scene.with(initModel()),
      Scene.type(emailField, 'alice@example.com'),
      Scene.type(passwordField, 'password'),
      Scene.expect(submitButton).toBeEnabled(),
    )
  })

  test('submitting with valid fields shows the loading state and requests auth', () => {
    Scene.scene(
      { update, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.expect(submittingButton).toExist(),
      Scene.expect(submittingButton).toBeDisabled(),
      Scene.Command.expectExact(SimulateAuthRequest),
      Scene.Command.resolve(
        SimulateAuthRequest,
        FailedSimulateAuthRequest({ error: '' }),
      ),
    )
  })

  test('failed auth shows the error and leaves submit disabled until the password changes', () => {
    Scene.scene(
      { update, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact(SimulateAuthRequest),
      Scene.Command.resolve(
        SimulateAuthRequest,
        FailedSimulateAuthRequest({ error: 'Invalid credentials' }),
      ),
      Scene.expect(
        Scene.within(Scene.role('form'), Scene.text('Invalid credentials')),
      ).toExist(),
      Scene.expect(submitButton).toBeDisabled(),
      Scene.type(passwordField, 'correcthorse'),
      Scene.expect(submitButton).toBeEnabled(),
    )
  })
})
