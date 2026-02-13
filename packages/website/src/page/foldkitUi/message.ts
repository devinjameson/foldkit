import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { ts } from 'foldkit/schema'

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
  HorizontalTabsDemoMessage,
  VerticalTabsDemoMessage,
)

export type HorizontalTabsDemoMessage =
  typeof HorizontalTabsDemoMessage.Type
export type VerticalTabsDemoMessage =
  typeof VerticalTabsDemoMessage.Type

export type Message = typeof Message.Type
