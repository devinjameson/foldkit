import classNames from 'classnames'
import { Html } from 'foldkit/html'

import { AriaLabel, Class, OnClick, button, div } from '../html'
import { Icon } from '../icon'
import { SetThemePreference, type ThemePreference } from '../main'

const themeSelectorButton = (
  preference: ThemePreference,
  isActive: boolean,
  icon: Html,
  label: string,
) =>
  button(
    [
      Class(
        classNames(
          'p-1.5 rounded-md transition',
          isActive
            ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
        ),
      ),
      AriaLabel(label),
      OnClick(SetThemePreference.make({ preference })),
    ],
    [icon],
  )

export const themeSelector = (
  currentPreference: ThemePreference,
): Html =>
  div(
    [
      Class(
        'flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800',
      ),
    ],
    [
      themeSelectorButton(
        'Light',
        currentPreference === 'Light',
        Icon.sun('w-4 h-4'),
        'Light mode',
      ),
      themeSelectorButton(
        'System',
        currentPreference === 'System',
        Icon.computer('w-4 h-4'),
        'System mode',
      ),
      themeSelectorButton(
        'Dark',
        currentPreference === 'Dark',
        Icon.moon('w-4 h-4'),
        'Dark mode',
      ),
    ],
  )
