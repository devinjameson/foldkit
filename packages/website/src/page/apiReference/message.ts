import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/schema'

export const GotDisclosureMessage = m('GotDisclosureMessage', {
  id: S.String,
  message: Ui.Disclosure.Message,
})

export const Message = S.Union(GotDisclosureMessage)
export type Message = typeof Message.Type
