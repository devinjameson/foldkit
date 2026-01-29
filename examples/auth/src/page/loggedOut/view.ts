import { Match as M } from 'effect'
import { Html, html } from 'foldkit/html'

import { homeRouter } from '../../route'
import { LoginMessage, Message } from './message'
import { Model } from './model'
import * as Home from './page/home'
import * as Login from './page/login'

export const view = <ParentMessage>(
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const { a, div, h1, p, Class, Href } = html<ParentMessage>()

  const notFoundView = (path: string): Html =>
    div(
      [Class('max-w-4xl mx-auto px-4 text-center')],
      [
        h1(
          [Class('text-4xl font-bold text-red-600 mb-6')],
          ['404 - Page Not Found'],
        ),
        p(
          [Class('text-lg text-gray-600 mb-4')],
          [`The path "${path}" was not found.`],
        ),
        a(
          [Href(homeRouter.build({})), Class('text-blue-500 hover:underline')],
          ['Go Home'],
        ),
      ],
    )

  return M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => Home.view(),
      Login: () =>
        Login.view(model.loginForm, (childMessage) =>
          toMessage(LoginMessage.make({ message: childMessage })),
        ),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )
}
