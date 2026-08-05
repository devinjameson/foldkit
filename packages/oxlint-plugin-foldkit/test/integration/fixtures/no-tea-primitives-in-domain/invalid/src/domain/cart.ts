import { Array, Effect, Schema as S } from 'effect'
import { Command, Subscription } from 'foldkit'
import { inertHtml as ih } from 'foldkit/html'
import { m } from 'foldkit/message'

export const CartItem = S.Struct({
  itemId: S.String,
  quantity: S.Number,
})

export const Cart = S.Array(CartItem)
export type Cart = typeof Cart.Type

// A Message names an event in one runtime's vocabulary.
export const ItemAdded = m('ItemAdded', { itemId: S.String })

// A Command pairs an effect with the Message it sends back.
export const LoadCart = Command.define('LoadCart', {
  execute: () => Effect.succeed([]),
  onSuccess: () => ItemAdded({ itemId: 'restored' }),
})

// A Subscription wires an outside source into that Message stream.
export const restore = Subscription.animationFrame(() =>
  ItemAdded({ itemId: 'restored' }),
)

// And markup settles how the concept looks, on behalf of every page.
export const badge = (cart: Cart) =>
  ih.span([], [String(Array.length(cart))])
