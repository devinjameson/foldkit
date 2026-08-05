import { Schema } from 'effect'

export const Item = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
})

export type Item = typeof Item.Type

export const CartItem = Schema.Struct({
  item: Item,
  quantity: Schema.Number,
})

export type CartItem = typeof CartItem.Type
