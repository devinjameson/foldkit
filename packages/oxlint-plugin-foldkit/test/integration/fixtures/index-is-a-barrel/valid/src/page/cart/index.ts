// A page module barrel lists the roles the page exposes. A type it re-exports
// is a type, so widening one here costs nothing at runtime.
export { Model, init } from './model'
export { Message, ClickedCheckout, type OutMessage } from './message'
export { update } from './update'
export { view } from './view'

export type CartView = ReturnType<typeof import('./view').view>
