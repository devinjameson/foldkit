// sort-imports-ignore

// src/page/cart/index.ts

// ❌ Bad
// The barrel grew a definition of its own. A sibling that wants `totalItems`
// now has to import the file that re-exports every other module beside it.
export * from './model'
export { update } from './update'
export { view } from './view'

export const totalItems = (cart: Cart): number =>
  pipe(
    cart.items,
    Array.reduce(0, (total, item) => total + item.quantity),
  )

// ✅ Good
// `totalItems` moves into the file that owns it, and the barrel goes back to
// listing what the page exposes.
export * from './model'
export { totalItems } from './model'
export { update } from './update'
export { view } from './view'
