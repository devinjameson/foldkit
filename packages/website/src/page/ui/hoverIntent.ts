import type { Html, HtmlBuilder } from 'foldkit/html'

import { HoverIntent } from '@foldkit/ui'

import { Message } from './message'
import type { Model } from './model'

const cardTriggerClassName =
  'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-accent-500 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:border-accent-500 dark:hover:text-accent-400'

const cardPanelClassName =
  'absolute left-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900'

const navTriggerClassName =
  'rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'

const navPanelClassName =
  'absolute right-0 top-full z-10 mt-2 grid w-80 gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900'

const CARD_TRIGGER_ID = 'hover-intent-card-trigger'
const CARD_PANEL_ID = 'hover-intent-card-panel'
const NAVIGATION_TRIGGER_ID = 'hover-intent-navigation-trigger'
const NAVIGATION_PANEL_ID = 'hover-intent-navigation-panel'

const hoverCard = (
  { trigger, panel, isVisible }: HoverIntent.RenderInfo,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('relative')],
    [
      h.button(
        [
          ...trigger,
          h.Id(CARD_TRIGGER_ID),
          h.AriaControls(CARD_PANEL_ID),
          h.AriaExpanded(isVisible),
          h.Class(cardTriggerClassName),
        ],
        ['Preview the release note'],
      ),
      ...(isVisible
        ? [
            h.div(
              [...panel, h.Id(CARD_PANEL_ID), h.Class(cardPanelClassName)],
              [
                h.p(
                  [
                    h.Class(
                      'text-xs font-semibold uppercase tracking-wider text-accent-700 dark:text-accent-400',
                    ),
                  ],
                  ['Release note'],
                ),
                h.h3(
                  [
                    h.Class(
                      'mt-1 text-base font-semibold text-gray-900 dark:text-white',
                    ),
                  ],
                  ['One primitive, two interaction surfaces'],
                ),
                h.p(
                  [
                    h.Class(
                      'mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400',
                    ),
                  ],
                  [
                    'The panel keeps the intent alive, so links remain usable after leaving the trigger.',
                  ],
                ),
                h.a(
                  [
                    h.Href('#api-reference'),
                    h.Class(
                      'mt-3 inline-block text-sm font-medium text-accent-700 underline underline-offset-4 dark:text-accent-400',
                    ),
                  ],
                  ['Read API reference'],
                ),
              ],
            ),
          ]
        : []),
    ],
  )

const hoverCardDemo = (
  hoverIntentCardDemo: HoverIntent.Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col items-start gap-3')],
    [
      h.p(
        [h.Class('text-sm text-gray-600 dark:text-gray-400')],
        ['Hover card. Move from the trigger into the interactive panel.'],
      ),
      h.submodel({
        slotId: 'hover-intent-card-demo',
        model: hoverIntentCardDemo,
        view: HoverIntent.view,
        viewInputs: {
          focusTriggerSelector: `#${CARD_TRIGGER_ID}`,
          toView: renderInfo => hoverCard(renderInfo, h),
        },
        toParentMessage: message =>
          Message.GotHoverIntentCardDemoMessage({ message }),
      }),
    ],
  )

const navigationMenu = (
  { trigger, panel, isVisible }: HoverIntent.RenderInfo,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('relative')],
    [
      h.button(
        [
          ...trigger,
          h.Id(NAVIGATION_TRIGGER_ID),
          h.AriaControls(NAVIGATION_PANEL_ID),
          h.AriaExpanded(isVisible),
          h.Class(navTriggerClassName),
        ],
        ['Resources'],
      ),
      ...(isVisible
        ? [
            h.div(
              [...panel, h.Id(NAVIGATION_PANEL_ID), h.Class(navPanelClassName)],
              [
                h.a(
                  [
                    h.Href('#overview'),
                    h.Class(
                      'rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-accent-600 dark:text-gray-300 dark:hover:bg-gray-800',
                    ),
                  ],
                  ['Overview'],
                ),
                h.a(
                  [
                    h.Href('#timing-and-dismissal'),
                    h.Class(
                      'rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-accent-600 dark:text-gray-300 dark:hover:bg-gray-800',
                    ),
                  ],
                  ['Timing and dismissal'],
                ),
                h.a(
                  [
                    h.Href('#api-reference'),
                    h.Class(
                      'rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-accent-600 dark:text-gray-300 dark:hover:bg-gray-800',
                    ),
                  ],
                  ['API reference'],
                ),
              ],
            ),
          ]
        : []),
    ],
  )

const navigationMenuDemo = (
  hoverIntentNavigationDemo: HoverIntent.Model,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class('flex flex-col items-start gap-3')],
    [
      h.p(
        [h.Class('text-sm text-gray-600 dark:text-gray-400')],
        ['Navigation menu. Focus or hover Resources, then enter the menu.'],
      ),
      h.nav(
        [
          h.Class(
            'flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900',
          ),
          h.AriaLabel('Hover Intent navigation example'),
        ],
        [
          h.span(
            [
              h.Class(
                'px-3 text-sm font-semibold text-gray-900 dark:text-white',
              ),
            ],
            ['Foldkit'],
          ),
          h.submodel({
            slotId: 'hover-intent-navigation-demo',
            model: hoverIntentNavigationDemo,
            view: HoverIntent.view,
            viewInputs: {
              focusTriggerSelector: `#${NAVIGATION_TRIGGER_ID}`,
              toView: renderInfo => navigationMenu(renderInfo, h),
            },
            toParentMessage: message =>
              Message.GotHoverIntentNavigationDemoMessage({ message }),
          }),
        ],
      ),
    ],
  )

export const demo = (
  model: Model,
  h: HtmlBuilder<Message>,
): ReadonlyArray<Html> => [
  h.div(
    [h.Class('grid w-full max-w-2xl gap-8')],
    [
      hoverCardDemo(model.hoverIntentCardDemo, h),
      navigationMenuDemo(model.hoverIntentNavigationDemo, h),
    ],
  ),
]
