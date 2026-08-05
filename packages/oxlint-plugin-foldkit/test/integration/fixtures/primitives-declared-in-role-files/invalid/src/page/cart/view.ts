import { Effect, Schema as S, Stream } from 'effect'
import { Command, Subscription } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { m } from 'foldkit/message'

// The Cart view declares the Message it dispatches, the Command that reloads
// the cart, and the Subscription that drives the reload, so three parts of
// this page live in the module named for a fourth.

export const ClickedReload = m('ClickedReload')

export const CompletedReload = m('CompletedReload', { total: S.Number })

export const ReloadCart = Command.define('ReloadCart', {
  messages: [CompletedReload],
  execute: Effect.succeed(CompletedReload({ total: 0 })),
})

export const reloadTicks = Subscription.persistent(
  Stream.repeatEffect(Effect.succeed(ClickedReload())),
)

export const view = (total: number) =>
  ih.div([], [ih.button([], [ih.text(`Reload ${total}`)])])
