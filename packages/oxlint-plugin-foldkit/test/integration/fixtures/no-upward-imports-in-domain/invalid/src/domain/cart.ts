import { Array, Option, Schema } from 'effect'

// Both of these point back up. The row builder belongs to one page, and the
// app update is what folds the domain in, so importing either turns the
// bottom layer into a dependent of the top.
import { cartRow } from '../page/cart/view'
import { Message } from '../update'

import { CartItem } from './item'

export const Cart = Schema.Array(CartItem)
export type Cart = typeof Cart.Type

export const rows = (cart: Cart) => Array.map(cart, cartRow)

export const firstMessage = (cart: Cart): Option.Option<Message> =>
  Option.map(Array.head(cart), ({ item }) => ({
    _tag: 'Selected' as const,
    itemId: item.id,
  }))
