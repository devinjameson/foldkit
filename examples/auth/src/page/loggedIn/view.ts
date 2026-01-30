import classNames from 'classnames'
import { Match as M } from 'effect'
import { Html } from 'foldkit/html'

import { Session } from '../../domain/session'
import { Class, Href, a, div, h1, li, main, nav, p, ul } from '../../html'
import type { Message as ParentMessage } from '../../message'
import { dashboardRouter, settingsRouter } from '../../route'
import { Message, SettingsMessage } from './message'
import { Model } from './model'
import * as Dashboard from './page/dashboard'
import * as Settings from './page/settings'

// VIEW

export const view = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const navigationView = (session: Session, currentRouteTag: string): Html => {
    const navLinkClassName = (isActive: boolean) =>
      classNames(
        'hover:bg-blue-600 font-medium px-3 py-1 rounded transition',
        isActive && 'bg-blue-700 bg-opacity-50',
      )

    return nav(
      [Class('bg-blue-500 text-white p-4')],
      [
        div(
          [Class('max-w-4xl mx-auto flex justify-between items-center')],
          [
            ul(
              [Class('flex gap-6 list-none')],
              [
                li(
                  [],
                  [
                    a(
                      [
                        Href(dashboardRouter.build({})),
                        Class(
                          navLinkClassName(currentRouteTag === 'Dashboard'),
                        ),
                      ],
                      ['Dashboard'],
                    ),
                  ],
                ),
                li(
                  [],
                  [
                    a(
                      [
                        Href(settingsRouter.build({})),
                        Class(navLinkClassName(currentRouteTag === 'Settings')),
                      ],
                      ['Settings'],
                    ),
                  ],
                ),
              ],
            ),
            div([Class('text-sm')], [`Signed in as ${session.email}`]),
          ],
        ),
      ],
    )
  }

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
          [
            Href(dashboardRouter.build({})),
            Class('text-blue-500 hover:underline'),
          ],
          ['Go to Dashboard'],
        ),
      ],
    )

  return div(
    [Class('min-h-screen')],
    [
      navigationView(model.session, model.route._tag),
      main(
        [Class('py-8')],
        [
          M.value(model.route).pipe(
            M.tagsExhaustive({
              Dashboard: () => Dashboard.view(model.session),
              Settings: () =>
                Settings.view(model.session, (childMessage) =>
                  toMessage(SettingsMessage.make({ message: childMessage })),
                ),
              NotFound: ({ path }) => notFoundView(path),
            }),
          ),
        ],
      ),
    ],
  )
}
