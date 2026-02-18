import { Effect, Match as M } from 'effect'
import { Runtime, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import {
  GotDialogDemoMessage,
  GotDisclosureDemoMessage,
  GotHorizontalTabsDemoMessage,
  GotMenuDemoMessage,
  GotVerticalTabsDemoMessage,
  type Message,
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
      GotDialogDemoMessage: ({ message }) => {
        const [nextDialogDemo, dialogCommands] = Ui.Dialog.update(
          model.dialogDemo,
          message,
        )

        return [
          evo(model, {
            dialogDemo: () => nextDialogDemo,
          }),
          dialogCommands.map(
            Effect.map((message) =>
              GotDialogDemoMessage.make({ message }),
            ),
          ),
        ]
      },

      GotDisclosureDemoMessage: ({ message }) => {
        const [nextDisclosureDemo, disclosureCommands] =
          Ui.Disclosure.update(model.disclosureDemo, message)

        return [
          evo(model, {
            disclosureDemo: () => nextDisclosureDemo,
          }),
          disclosureCommands.map(
            Effect.map((message) =>
              GotDisclosureDemoMessage.make({ message }),
            ),
          ),
        ]
      },

      GotMenuDemoMessage: ({ message }) => {
        const [nextMenuDemo, menuCommands] = Ui.Menu.update(
          model.menuDemo,
          message,
        )

        return [
          evo(model, {
            menuDemo: () => nextMenuDemo,
          }),
          menuCommands.map(
            Effect.map((message) =>
              GotMenuDemoMessage.make({ message }),
            ),
          ),
        ]
      },

      GotHorizontalTabsDemoMessage: ({ message }) => {
        const [nextHorizontalTabsDemo, horizontalTabsCommands] =
          Ui.Tabs.update(model.horizontalTabsDemo, message)

        return [
          evo(model, {
            horizontalTabsDemo: () => nextHorizontalTabsDemo,
          }),
          horizontalTabsCommands.map(
            Effect.map((message) =>
              GotHorizontalTabsDemoMessage.make({ message }),
            ),
          ),
        ]
      },

      GotVerticalTabsDemoMessage: ({ message }) => {
        const [nextVerticalTabsDemo, verticalTabsCommands] =
          Ui.Tabs.update(model.verticalTabsDemo, message)

        return [
          evo(model, {
            verticalTabsDemo: () => nextVerticalTabsDemo,
          }),
          verticalTabsCommands.map(
            Effect.map((message) =>
              GotVerticalTabsDemoMessage.make({ message }),
            ),
          ),
        ]
      },
    }),
  )
