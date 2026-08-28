import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { HoverIntent } from '@foldkit/ui'

import { UiMessage } from '../message'
import type { UiModel } from '../model'

const triggerClassName =
  'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:border-accent-500 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600'

const panelClassName =
  'absolute left-0 top-full z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg'

const TRIGGER_ID = 'hover-intent-showcase-trigger'
const PANEL_ID = 'hover-intent-showcase-panel'

export const view = Submodel.defineView<UiModel, UiMessage>((model, h): Html =>
  h.div(
    [],
    [
      h.h2(
        [h.Class('text-2xl font-bold text-gray-900 mb-6')],
        ['Hover Intent'],
      ),
      h.p(
        [h.Class('mb-4 max-w-xl text-sm text-gray-600')],
        [
          'Hover or focus the trigger, then move into the interactive panel. Press Escape to return focus to the trigger.',
        ],
      ),
      h.submodel({
        slotId: 'hover-intent-showcase',
        model: model.hoverIntentDemo,
        view: HoverIntent.view,
        viewInputs: {
          focusTriggerSelector: `#${TRIGGER_ID}`,
          toView: ({ trigger, panel, isVisible }) =>
            h.div(
              [h.Class('relative inline-block')],
              [
                h.button(
                  [
                    ...trigger,
                    h.Id(TRIGGER_ID),
                    h.AriaControls(PANEL_ID),
                    h.AriaExpanded(isVisible),
                    h.Class(triggerClassName),
                  ],
                  ['Preview account'],
                ),
                ...(isVisible
                  ? [
                      h.div(
                        [...panel, h.Id(PANEL_ID), h.Class(panelClassName)],
                        [
                          h.h3(
                            [
                              h.Id('hover-intent-showcase-details'),
                              h.Class('font-semibold text-gray-900'),
                            ],
                            ['Account summary'],
                          ),
                          h.p(
                            [h.Class('mt-2 text-sm text-gray-600')],
                            ['Review your profile and recent activity.'],
                          ),
                          h.a(
                            [
                              h.Href('#hover-intent-showcase-details'),
                              h.Class(
                                'mt-3 inline-block text-sm font-medium text-accent-700 underline underline-offset-4',
                              ),
                            ],
                            ['View account details'],
                          ),
                        ],
                      ),
                    ]
                  : []),
              ],
            ),
        },
        toParentMessage: message =>
          UiMessage.GotHoverIntentDemoMessage({ message }),
      }),
    ],
  ),
)
