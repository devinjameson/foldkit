import { Match as M } from 'effect'

export const view = (model: Model) =>
  M.value(model).pipe(
    M.tagsExhaustive({
      LoggedOut: renderLoginForm,
      LoggedIn: renderDashboard,
    }),
  )
