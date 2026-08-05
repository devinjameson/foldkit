import { Array, Number, Option, Predicate, Schema } from 'effect'
import { evo } from 'foldkit/struct'

export const CartItem = Schema.Struct({
  itemId: Schema.String,
  quantity: Schema.Number,
})

export type CartItem = typeof CartItem.Type

export const Cart = Schema.Array(CartItem)
export type Cart = typeof Cart.Type

const hasItemId =
  (itemId: string) =>
  (cartItem: CartItem): boolean =>
    cartItem.itemId === itemId

// `Array.map`, `Array.filter`, and `Option.filter` share their names with SVG
// and MathML tags. They are pure helpers on a namespace that is not an html
// builder, so nothing here is view markup.
export const addItem =
  (itemId: string) =>
  (cart: Cart): Cart =>
    Option.match(Array.findFirst(cart, hasItemId(itemId)), {
      onNone: () => [...cart, { itemId, quantity: 1 }],
      onSome: () =>
        Array.map(cart, cartItem =>
          hasItemId(itemId)(cartItem)
            ? evo(cartItem, { quantity: Number.increment })
            : cartItem,
        ),
    })

export const removeItem =
  (itemId: string) =>
  (cart: Cart): Cart =>
    Array.filter(cart, Predicate.not(hasItemId(itemId)))

export const totalItems = (cart: Cart): number =>
  Array.reduce(cart, 0, (total, { quantity }) => total + quantity)
