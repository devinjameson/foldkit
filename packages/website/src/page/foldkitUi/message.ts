import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/schema'

export const GotDialogDemoMessage = m('GotDialogDemoMessage', {
  message: Ui.Dialog.Message,
})
export const GotDisclosureDemoMessage = m(
  'GotDisclosureDemoMessage',
  {
    message: Ui.Disclosure.Message,
  },
)
export const GotMenuBasicDemoMessage = m('GotMenuBasicDemoMessage', {
  message: Ui.Menu.Message,
})
export const GotMenuAnimatedDemoMessage = m(
  'GotMenuAnimatedDemoMessage',
  {
    message: Ui.Menu.Message,
  },
)
export const GotHorizontalTabsDemoMessage = m(
  'GotHorizontalTabsDemoMessage',
  {
    message: Ui.Tabs.Message,
  },
)
export const GotVerticalTabsDemoMessage = m(
  'GotVerticalTabsDemoMessage',
  {
    message: Ui.Tabs.Message,
  },
)

export const Message = S.Union(
  GotDialogDemoMessage,
  GotDisclosureDemoMessage,
  GotMenuBasicDemoMessage,
  GotMenuAnimatedDemoMessage,
  GotHorizontalTabsDemoMessage,
  GotVerticalTabsDemoMessage,
)
export type Message = typeof Message.Type
