import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { ts } from 'foldkit/schema'

export const DisclosureToggled = ts('DisclosureToggled', {
  id: S.String,
  message: Ui.Disclosure.Message,
})

export const Message = S.Union(DisclosureToggled)

export type DisclosureToggled = typeof DisclosureToggled.Type

export type Message = typeof Message.Type
