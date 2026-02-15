import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { ts } from 'foldkit/schema'

export const FaqDisclosureToggled = ts('FaqDisclosureToggled', {
  id: S.String,
  message: Ui.Disclosure.Message,
})

export const Message = S.Union(FaqDisclosureToggled)

export type FaqDisclosureToggled = typeof FaqDisclosureToggled.Type

export type Message = typeof Message.Type
