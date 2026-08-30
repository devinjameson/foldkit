import { clsx } from 'clsx'
import { Option } from 'effect'
import { Html, type HtmlBuilder } from 'foldkit/html'

import { Icon } from '../icon'
import { Message, type ThemePreference } from '../message'

export const themeSelector = (
  maybeActivePreference: Option.Option<ThemePreference>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [
      h.Role('group'),
      h.AriaLabel('Theme preference'),
      h.Class(
        'flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700',
      ),
    ],
    [
      themeSelectorButton(
        'Light',
        maybeActivePreference,
        Icon.sun('w-4 h-4'),
        'Light mode',
        h,
      ),
      themeSelectorButton(
        'System',
        maybeActivePreference,
        Icon.computer('w-4 h-4'),
        'System mode',
        h,
      ),
      themeSelectorButton(
        'Dark',
        maybeActivePreference,
        Icon.moon('w-4 h-4'),
        'Dark mode',
        h,
      ),
    ],
  )

const themeSelectorButton = (
  preference: ThemePreference,
  maybeActivePreference: Option.Option<ThemePreference>,
  icon: Html,
  label: string,
  h: HtmlBuilder<Message>,
) => {
  const isActive = Option.exists(
    maybeActivePreference,
    activePreference => activePreference === preference,
  )

  return h.button(
    [
      h.AriaPressed(isActive.toString()),
      h.Class(
        clsx(
          'p-2 rounded-md transition cursor-pointer',
          isActive
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        ),
      ),
      h.AriaLabel(label),
      h.OnClick(Message.SelectedThemePreference({ preference })),
    ],
    [icon],
  )
}
