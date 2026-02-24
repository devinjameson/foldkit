import { Array, Record, pipe } from 'effect'
import { Ui } from 'foldkit'
import { Command } from 'foldkit/command'

import { FAQ_IDS } from './faq'
import type { Message } from './message'
import type { Model } from './model'

export type InitReturn = [Model, ReadonlyArray<Command<Message>>]

export const init = (): InitReturn => {
  const disclosures: Model = pipe(
    FAQ_IDS,
    Array.map(id => [id, Ui.Disclosure.init({ id })] as const),
    Record.fromEntries,
  )

  return [disclosures, []]
}
