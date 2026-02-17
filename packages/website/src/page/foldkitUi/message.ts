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
  GotHorizontalTabsDemoMessage,
  GotVerticalTabsDemoMessage,
)

export type GotDialogDemoMessage = typeof GotDialogDemoMessage.Type
export type GotDisclosureDemoMessage =
  typeof GotDisclosureDemoMessage.Type
export type GotHorizontalTabsDemoMessage =
  typeof GotHorizontalTabsDemoMessage.Type
export type GotVerticalTabsDemoMessage =
  typeof GotVerticalTabsDemoMessage.Type

export type Message = typeof Message.Type
