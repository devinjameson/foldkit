import { Match as M } from 'effect'
import { Html, html } from 'foldkit/html'

import { LoggedInMessage, LoggedOutMessage, Message } from './message'
import { LoggedIn, LoggedOut, Model } from './model'

const { div, keyed, Class } = html<Message>()

export const view = (model: Model): Html =>
  div(
    [Class('min-h-screen bg-gray-100')],
    [
      keyed('div')(
        model._tag,
        [],
        [
          M.value(model).pipe(
            M.tagsExhaustive({
              LoggedOut: (loggedOutModel) =>
                wrapLoggedOutView(
                  LoggedOut.view(loggedOutModel, (childMessage) =>
                    LoggedOutMessage.make({ message: childMessage }),
                  ),
                ),
              LoggedIn: (loggedInModel) =>
                LoggedIn.view(loggedInModel, (childMessage) =>
                  LoggedInMessage.make({ message: childMessage }),
                ),
            }),
          ),
        ],
      ),
    ],
  )

const wrapLoggedOutView = (childView: Html): Html => {
  const { div, Class } = html<Message>()
  return div([Class('py-8')], [childView])
}
