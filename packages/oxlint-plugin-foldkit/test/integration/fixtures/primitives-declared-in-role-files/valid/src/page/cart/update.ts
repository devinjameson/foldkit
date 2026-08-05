import { Effect, Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { pushUrl } from 'foldkit/navigation'

import { ReloadCart } from './command'
import { ClickedReload, CompletedReload, type Message } from './message'
import type { Model } from './model'

// A Command lives beside the update function that returns it, which is why
// this navigation Command is declared here rather than in command.ts.

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: S.String },
  messages: [CompletedReload],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(CompletedReload({ total: 0 }))),
})

export const update = (model: Model, message: Message) =>
  M.value(message).pipe(
    M.tagsExhaustive({
      ClickedReload: () => [model, [ReloadCart()]] as const,
      CompletedReload: ({ total }) =>
        [{ ...model, total }, [NavigateInternal({ url: '/cart' })]] as const,
    }),
  )

export const reload = () => ClickedReload()
