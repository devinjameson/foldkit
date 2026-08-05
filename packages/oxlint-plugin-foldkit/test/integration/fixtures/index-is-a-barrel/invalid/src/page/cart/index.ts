import { Schema as S } from 'effect'
import { message as m } from 'foldkit/message'

// A Message defined in the barrel has no file of its own, so `message.ts` is
// no longer the answer to where the page's Messages live.
export { Model, init } from './model'
export { update } from './update'
export { view } from './view'

export const ClickedCheckout = m('ClickedCheckout', { total: S.Number })
