import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { ts } from 'foldkit/schema'

export const DisclosureDemoMessage = ts('DisclosureDemoMessage', {
  message: Ui.Disclosure.Message,
})
export const HorizontalTabsDemoMessage = ts(
  'HorizontalTabsDemoMessage',
  {
    message: Ui.Tabs.Message,
  },
)
export const VerticalTabsDemoMessage = ts('VerticalTabsDemoMessage', {
  message: Ui.Tabs.Message,
})

export const Message = S.Union(
  DisclosureDemoMessage,
  HorizontalTabsDemoMessage,
  VerticalTabsDemoMessage,
)

export type DisclosureDemoMessage = typeof DisclosureDemoMessage.Type
export type HorizontalTabsDemoMessage =
  typeof HorizontalTabsDemoMessage.Type
export type VerticalTabsDemoMessage =
  typeof VerticalTabsDemoMessage.Type

export type Message = typeof Message.Type
