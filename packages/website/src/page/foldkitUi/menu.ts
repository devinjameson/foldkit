import { Match as M } from 'effect'
import { Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Class, div, span } from '../../html'
import { Icon } from '../../icon'
import type { Message as ParentMessage } from '../../main'
import type { TableOfContentsEntry } from '../../main'
import { GotMenuDemoMessage, type Message } from './message'
import type { Model } from './model'

// TABLE OF CONTENTS

export const menuHeader: TableOfContentsEntry = {
  level: 'h2',
  id: 'menu',
  text: 'Menu',
}

// DEMO CONTENT

const triggerClassName =
  'inline-flex items-center gap-1.5 px-4 py-2 text-base font-medium cursor-pointer transition rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 select-none'

const itemsClassName =
  'absolute mt-1 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden z-10 outline-none'

const itemClassName =
  'px-3 py-2 text-base text-gray-700 dark:text-gray-200 cursor-pointer data-[active]:bg-gray-100 dark:data-[active]:bg-gray-700/50 data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed'

const backdropClassName = 'fixed inset-0 z-0'

const wrapperClassName = 'relative inline-block'

const headingClassName =
  'px-3 pt-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500'

const ICON_SIZE = 'w-4 h-4'

type MenuItem = 'Edit' | 'Duplicate' | 'Archive' | 'Move' | 'Delete'

const MENU_ITEMS: ReadonlyArray<MenuItem> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Move',
  'Delete',
]

const menuItemIcon = (item: MenuItem): Html =>
  M.value(item).pipe(
    M.when('Edit', () => Icon.pencil(ICON_SIZE)),
    M.when('Duplicate', () => Icon.documentDuplicate(ICON_SIZE)),
    M.when('Archive', () => Icon.archiveBox(ICON_SIZE)),
    M.when('Move', () => Icon.arrowRight(ICON_SIZE)),
    M.when('Delete', () => Icon.trash(ICON_SIZE)),
    M.exhaustive,
  )

const isItemDisabled = (item: MenuItem): boolean => item === 'Archive'

const itemGroupKey = (item: MenuItem): string =>
  M.value(item).pipe(
    M.when('Delete', () => 'Danger'),
    M.orElse(() => 'Actions'),
  )

const groupToHeading = (
  groupKey: string,
): Ui.Menu.GroupHeading | undefined =>
  M.value(groupKey).pipe(
    M.when('Danger', () => ({
      content: span([], ['Danger Zone']),
      className: headingClassName,
    })),
    M.orElse(() => undefined),
  )

// VIEW

export const menuDemo = (
  model: Model,
  toMessage: (message: Message) => ParentMessage,
) => {
  const toMenuMessage = (message: Ui.Menu.Message) =>
    toMessage(GotMenuDemoMessage.make({ message }))

  return [
    div(
      [Class('relative')],
      [
        Ui.Menu.view({
          model: model.menuDemo,
          toMessage: toMenuMessage,
          items: MENU_ITEMS,
          itemToConfig: (item) => ({
            className: itemClassName,
            content: div(
              [Class('flex items-center gap-2.5')],
              [menuItemIcon(item), span([], [item])],
            ),
          }),
          isItemDisabled,
          buttonContent: div(
            [Class('flex items-center gap-4')],
            [span([], ['Actions']), Icon.chevronDown('w-4 h-4')],
          ),
          buttonClassName: triggerClassName,
          itemsClassName,
          backdropClassName,
          className: wrapperClassName,
          itemGroupKey,
          groupToHeading,
        }),
      ],
    ),
  ]
}
