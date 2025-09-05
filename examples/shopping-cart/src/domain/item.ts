import { Schema } from 'effect'

export const Item = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  price: Schema.Number,
})

export type Item = Schema.Schema.Type<typeof Item>

export const CartItem = Schema.Struct({
  item: Item,
  quantity: Schema.Number,
})

export type CartItem = Schema.Schema.Type<typeof CartItem>
