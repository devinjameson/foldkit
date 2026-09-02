import { clsx } from 'clsx'
import { Html, type HtmlBuilder } from 'foldkit/html'

import { Icon } from '../icon'
import { Message } from '../message'
import { type Model } from '../model'
import * as Search from '../search'

const keyboardWarmupSelector = `#${Search.KEYBOARD_WARMUP_INPUT_ID}`

const onClickOpenSearch = (h: HtmlBuilder<Message>) =>
  h.OnClick(Message.ClickedOpenSearch(), {
    focusSelector: keyboardWarmupSelector,
  })

export const dialogView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: 'search',
    model: model.search,
    view: Search.view,
    toParentMessage: message => Message.GotSearchMessage({ message }),
  })

export const triggerView = (className: string, h: HtmlBuilder<Message>): Html =>
  h.button(
    [
      h.Class(
        clsx(
          'items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-sm hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer',
          className,
        ),
      ),
      h.AriaLabel('Search documentation'),
      onClickOpenSearch(h),
    ],
    [
      Icon.magnifyingGlass('w-4 h-4'),
      h.span([h.Class('mr-4')], ['Search...']),
      h.span(
        [
          h.AriaHidden(true),
          h.Class(
            'text-xs text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-700 rounded px-1.5 py-px font-mono',
          ),
        ],
        ['⌘K'],
      ),
    ],
  )

export const compactTriggerView = (
  className: string,
  h: HtmlBuilder<Message>,
): Html =>
  h.button(
    [
      h.Class(
        clsx(
          'items-center p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
          className,
        ),
      ),
      h.AriaLabel('Search documentation'),
      onClickOpenSearch(h),
    ],
    [Icon.magnifyingGlass('w-5 h-5')],
  )
