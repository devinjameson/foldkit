import { Schema as S } from 'effect'
import { Html, html } from 'foldkit/html'
import { ts } from 'foldkit/schema'

import { Session } from '../../../domain/session'

const LogoutClicked = ts('LogoutClicked')

export const Message = S.Union(LogoutClicked)

export type LogoutClicked = typeof LogoutClicked.Type
export type Message = typeof Message.Type

export const view = <ParentMessage>(
  session: Session,
  toMessage: (message: Message) => ParentMessage,
): Html => {
  const { button, div, h1, h2, p, Class, OnClick } = html<ParentMessage>()

  return div(
    [Class('max-w-4xl mx-auto px-4')],
    [
      h1([Class('text-4xl font-bold text-gray-800 mb-6')], ['Settings']),
      div(
        [Class('bg-white rounded-lg shadow-md p-6 mb-6')],
        [
          h2(
            [Class('text-xl font-semibold text-gray-800 mb-4')],
            ['Account Information'],
          ),
          div(
            [Class('space-y-4')],
            [
              infoRow('User ID', session.userId),
              infoRow('Email', session.email),
              infoRow('Name', session.name),
            ],
          ),
        ],
      ),
      div(
        [Class('bg-white rounded-lg shadow-md p-6')],
        [
          h2([Class('text-xl font-semibold text-gray-800 mb-4')], ['Actions']),
          button(
            [
              OnClick(toMessage(LogoutClicked.make())),
              Class(
                'px-6 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition cursor-pointer',
              ),
            ],
            ['Sign Out'],
          ),
        ],
      ),
    ],
  )

  function infoRow(label: string, value: string): Html {
    return div(
      [
        Class(
          'flex justify-between items-center py-2 border-b border-gray-100',
        ),
      ],
      [
        p([Class('text-gray-600')], [label]),
        p([Class('font-medium text-gray-800')], [value]),
      ],
    )
  }
}
