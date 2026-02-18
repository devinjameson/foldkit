import { Ui } from 'foldkit'

import { Class, Id, OnClick, button, div, h2, p } from '../../html'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { GotDialogDemoMessage, type Message } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

export const dialogHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'dialog',
  text: 'Dialog',
}

// DEMO CONTENT

const triggerClassName =
  'px-4 py-2 text-base font-medium cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const backdropClassName = 'fixed inset-0 bg-black/50'

const panelClassName =
  'bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-auto relative shadow-xl'

const titleClassName =
  'text-lg font-medium text-gray-900 dark:text-white mb-2'

const dialogClassName =
  'backdrop:bg-transparent bg-transparent p-0 m-auto'

const cancelButtonClassName =
  'px-4 py-2 text-sm font-medium cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'

const confirmButtonClassName =
  'px-4 py-2 text-sm font-medium cursor-pointer transition rounded-lg bg-blue-600 text-white hover:bg-blue-700'

// VIEW

export const dialogDemo = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
) => {
  const toDialogMessage = (message: Ui.Dialog.Message) =>
    toMessage(GotDialogDemoMessage.make({ message }))

  return [
    div(
      [Class('flex gap-3')],
      [
        button(
          [
            Class(triggerClassName),
            OnClick(toDialogMessage(Ui.Dialog.Opened.make())),
          ],
          ['Open Dialog'],
        ),
      ],
    ),
    Ui.Dialog.view({
      model: model.dialogDemo,
      toMessage: toDialogMessage,
      panelContent: div(
        [],
        [
          h2(
            [
              Class(titleClassName),
              Id(Ui.Dialog.titleId(model.dialogDemo)),
            ],
            ['Confirm Action'],
          ),
          p(
            [Class('text-gray-600 dark:text-gray-300 mb-4')],
            [
              'Are you sure you want to proceed? This action demonstrates the Dialog component with focus trapping, backdrop click, and Escape key handling.',
            ],
          ),
          div(
            [Class('flex gap-2 justify-end')],
            [
              button(
                [
                  Class(cancelButtonClassName),
                  OnClick(toDialogMessage(Ui.Dialog.Closed.make())),
                ],
                ['Cancel'],
              ),
              button(
                [
                  Class(confirmButtonClassName),
                  OnClick(toDialogMessage(Ui.Dialog.Closed.make())),
                ],
                ['Confirm'],
              ),
            ],
          ),
        ],
      ),
      panelClassName,
      backdropClassName,
      className: dialogClassName,
    }),
  ]
}
