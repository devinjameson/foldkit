// sort-imports-ignore

import { Array, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { m } from 'foldkit/message'

// src/domain/cart.ts

// ❌ Bad
// A Message, a Command, and view markup each tie the module to one runtime's
// vocabulary or one screen's presentation, which is what stops a second page
// from sharing it and what stops it taking an ordinary test.
export const ClickedClearCart = m('ClickedClearCart')
export const FetchCart = Command.define('FetchCart', { execute: fetchCart })
export const cartRow = (item: Item) => ih.li([], [item.name])

// ✅ Good
// A schema and pure functions over it. `Schema` is the point of the module, and
// `Effect` for a pure computation is fine too.
export const Cart = S.Struct({ items: S.Array(Item) })

export const totalItems = (cart: typeof Cart.Type): number =>
  Array.reduce(cart.items, 0, (total, item) => total + item.quantity)
