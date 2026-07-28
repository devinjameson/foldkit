import { Scene } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { describe, test } from 'vitest'

import { SaveSession } from './command'
import { CompletedNavigateInternal, SucceededSaveSession } from './message'
import { LoggedOut } from './model'
import {
  SimulateAuthRequest,
  SucceededSimulateAuthRequest,
  initModel as initLoginModel,
} from './page/loggedOut/page/login'
import { LoginRoute } from './route'
import { RedirectToDashboard, update } from './update'
import { view } from './view'

const validModel = LoggedOut.Model({
  route: LoginRoute(),
  loginModel: {
    ...initLoginModel(),
    email: Valid({ value: 'alice@example.com' }),
    password: Valid({ value: 'password' }),
  },
})

const aliceSession = { userId: '1', email: 'alice@example.com', name: 'alice' }

describe('login flow', () => {
  test('successful login saves the session and lands on the dashboard', () => {
    Scene.scene(
      { update, view },
      Scene.with(validModel),
      Scene.submit(Scene.role('form')),
      Scene.Command.expectExact(SimulateAuthRequest),
      Scene.Command.resolve(
        SimulateAuthRequest,
        SucceededSimulateAuthRequest({ session: aliceSession }),
      ),
      Scene.Command.expectExact(SaveSession, RedirectToDashboard),
      Scene.Command.resolveAll(
        [SaveSession, SucceededSaveSession()],
        [RedirectToDashboard, CompletedNavigateInternal()],
      ),
      Scene.expect(Scene.text('Welcome back, alice!')).toExist(),
    )
  })
})
