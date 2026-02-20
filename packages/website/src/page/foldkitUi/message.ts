import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { ts } from 'foldkit/schema'

export const GotDialogDemoMessage = ts('GotDialogDemoMessage', {
  message: Ui.Dialog.Message,
})
export const GotDisclosureDemoMessage = ts(
  'GotDisclosureDemoMessage',
  {
    message: Ui.Disclosure.Message,
  },
)
export const GotMenuBasicDemoMessage = ts('GotMenuBasicDemoMessage', {
  message: Ui.Menu.Message,
})
export const GotMenuAnimatedDemoMessage = ts(
  'GotMenuAnimatedDemoMessage',
  {
    message: Ui.Menu.Message,
  },
)
export const GotHorizontalTabsDemoMessage = ts(
  'GotHorizontalTabsDemoMessage',
  {
    message: Ui.Tabs.Message,
  },
)
export const GotVerticalTabsDemoMessage = ts(
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
