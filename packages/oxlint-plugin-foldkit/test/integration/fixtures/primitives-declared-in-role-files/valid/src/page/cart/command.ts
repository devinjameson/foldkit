import { Effect } from 'effect'
import { Command } from 'foldkit'

import { CompletedReload } from './message'

export const ReloadCart = Command.define('ReloadCart', {
  messages: [CompletedReload],
  execute: Effect.succeed(CompletedReload({ total: 0 })),
})
