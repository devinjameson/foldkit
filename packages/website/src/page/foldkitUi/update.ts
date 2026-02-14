import { Effect, Match as M } from 'effect'
import { Runtime, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  DisclosureDemoMessage,
  HorizontalTabsDemoMessage,
  type Message,
  VerticalTabsDemoMessage,
} from './message'
import type { Model } from './model'

export type UpdateReturn = [
  Model,
  ReadonlyArray<Runtime.Command<Message>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

export const update = (
  model: Model,
  message: Message,
): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      DisclosureDemoMessage: ({ message }) => {
        const [nextDisclosureDemo, disclosureCommands] =
          Ui.Disclosure.update(model.disclosureDemo, message)

        return [
          evo(model, {
            disclosureDemo: () => nextDisclosureDemo,
          }),
          disclosureCommands.map(
            Effect.map((message) =>
              DisclosureDemoMessage.make({ message }),
            ),
          ),
        ]
      },

      HorizontalTabsDemoMessage: ({ message }) => {
        const [nextHorizontalTabsDemo, horizontalTabsCommands] =
          Ui.Tabs.update(model.horizontalTabsDemo, message)

        return [
          evo(model, {
            horizontalTabsDemo: () => nextHorizontalTabsDemo,
          }),
          horizontalTabsCommands.map(
            Effect.map((message) =>
              HorizontalTabsDemoMessage.make({ message }),
            ),
          ),
        ]
      },

      VerticalTabsDemoMessage: ({ message }) => {
        const [nextVerticalTabsDemo, verticalTabsCommands] =
          Ui.Tabs.update(model.verticalTabsDemo, message)

        return [
          evo(model, {
            verticalTabsDemo: () => nextVerticalTabsDemo,
          }),
          verticalTabsCommands.map(
            Effect.map((message) =>
              VerticalTabsDemoMessage.make({ message }),
            ),
          ),
        ]
      },
    }),
  )
