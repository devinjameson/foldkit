// sort-imports-ignore

// src/page/cart/index.ts

// ❌ Bad
// The barrel grew a definition of its own. A sibling that wants the total now
// has to import the file that re-exports every other module beside it.
export * from './model'
export { update } from './update'
export { view } from './view'

export const badTotalItems = (cart: Cart): number =>
  Array.reduce(cart.items, 0, (total, item) => total + item.quantity)

// ✅ Good
// The definition moves into src/page/cart/model.ts, which the barrel already
// re-exports, so the barrel needs no new line and no call site changes.
export const totalItems = (cart: Cart): number =>
  Array.reduce(cart.items, 0, (total, item) => total + item.quantity)
