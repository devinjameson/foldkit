import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { ts } from 'foldkit/schema'

export const GotFaqDisclosureMessage = ts('GotFaqDisclosureMessage', {
  id: S.String,
  message: Ui.Disclosure.Message,
})

export const Message = S.Union(GotFaqDisclosureMessage)

export type GotFaqDisclosureMessage =
  typeof GotFaqDisclosureMessage.Type

export type Message = typeof Message.Type
