import { ts } from 'foldkit/schema'

import { LoggedOutRoute } from '../../route'
import * as Login from './page/login'

export const Model = ts('LoggedOut', {
  route: LoggedOutRoute,
  loginForm: Login.Model,
})

export type Model = typeof Model.Type

export const init = (route: LoggedOutRoute): Model =>
  Model.make({
    route,
    loginForm: Login.initModel(),
  })
