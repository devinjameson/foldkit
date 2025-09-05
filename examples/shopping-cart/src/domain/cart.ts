import { Array, flow, Number, Option, Predicate, Schema } from 'effect'
import { CartItem, Item } from './item'

export const Cart = Schema.Array(CartItem)
export type Cart = Schema.Schema.Type<typeof Cart>

const hasItemId =
  (itemId: string) =>
  (cartItem: CartItem): boolean =>
    cartItem.item.id === itemId

export const addItem =
  (item: Item) =>
  (cart: Cart): Cart => {
    const existingCartItem = Array.findFirst(cart, hasItemId(item.id))

    return Option.match(existingCartItem, {
      onNone: () => Array.append(cart, { item, quantity: 1 }),
      onSome: () =>
        Array.map(cart, (cartItem) =>
          hasItemId(item.id)(cartItem)
            ? { ...cartItem, quantity: Number.increment(cartItem.quantity) }
            : cartItem,
        ),
    })
  }

export const removeItem =
  (itemId: string) =>
  (cart: Cart): Cart =>
    Array.filter(cart, Predicate.not(hasItemId(itemId)))

export const changeQuantity = (itemId: string, quantity: number) =>
  quantity <= 0
    ? removeItem(itemId)
    : Array.map<Cart, CartItem>((cartItem) =>
        hasItemId(itemId)(cartItem) ? { ...cartItem, quantity } : cartItem,
      )

export const itemQuantity = (itemId: string) =>
  flow(
    Array.findFirst<CartItem>(hasItemId(itemId)),
    Option.match({
      onNone: () => 0,
      onSome: ({ quantity }) => quantity,
    }),
  )

export const totalItems = Array.reduce<number, CartItem>(
  0,
  (total, { quantity }) => total + quantity,
)
