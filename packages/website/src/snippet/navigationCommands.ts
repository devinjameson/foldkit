import { Effect, Schema as S } from 'effect'
import { Navigation } from 'foldkit'
import { ts } from 'foldkit/schema'

const NoOp = ts('NoOp')
const Message = S.Union(NoOp)
type Message = typeof Message.Type

const pushUrl = Navigation.pushUrl('/people/42').pipe(
  Effect.as(NoOp.make()),
)

const replaceUrl = Navigation.replaceUrl('/people/42').pipe(
  Effect.as(NoOp.make()),
)

const goBack = Navigation.back().pipe(Effect.as(NoOp.make()))

const goForward = Navigation.forward().pipe(Effect.as(NoOp.make()))

const loadUrl = Navigation.load('https://example.com').pipe(
  Effect.as(NoOp.make()),
)
