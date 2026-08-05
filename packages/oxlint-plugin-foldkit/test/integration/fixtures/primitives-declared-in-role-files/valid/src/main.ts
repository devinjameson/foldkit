import { Effect, Schema as S, Stream } from 'effect'
import { Command, Subscription } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { m } from 'foldkit/message'

// The simplest Foldkit apps keep everything in main.ts. Nothing here claims a
// role, so nothing here can contradict one.

export const Model = S.Struct({ count: S.Number })
export type Model = typeof Model.Type

export const ClickedIncrement = m('ClickedIncrement')
export const Tick = m('Tick')
export const Message = S.Union([ClickedIncrement, Tick])
export type Message = typeof Message.Type

export const Log = Command.define('Log', {
  messages: [Tick],
  execute: Effect.succeed(Tick()),
})

export const ticks = Subscription.persistent(
  Stream.repeatEffect(Effect.succeed(Tick())),
)

export const view = (model: Model) =>
  ih.div([], [ih.text(String(model.count))])
