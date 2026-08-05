import { Array, Number, Option, Predicate, Schema } from 'effect'
import { evo } from 'foldkit/struct'

// A dependency, a shared constant that sits beside the domain folder, a
// sibling domain module, and a helper inside the app view folder are all
// below or beside this module, so none of them point back up.
import { LIMITS } from '../constants'
import { formatPrice } from '../view/price'
import { CartItem, Item } from './item'

export const Cart = Schema.Array(CartItem)
export type Cart = typeof Cart.Type

const hasItemId =
  (itemId: string) =>
  (cartItem: CartItem): boolean =>
    cartItem.item.id === itemId

export const addItem =
  (item: Item) =>
  (cart: Cart): Cart =>
    Option.match(Array.findFirst(cart, hasItemId(item.id)), {
      onNone: () => [...cart, { item, quantity: 1 }],
      onSome: () =>
        Array.map(cart, cartItem =>
          hasItemId(item.id)(cartItem)
            ? evo(cartItem, { quantity: Number.increment })
            : cartItem,
        ),
    })

export const removeItem =
  (itemId: string) =>
  (cart: Cart): Cart =>
    Array.filter(cart, Predicate.not(hasItemId(itemId)))

export const isFull = (cart: Cart): boolean => cart.length >= LIMITS.maxItems

export const showTotal = (cart: Cart): string =>
  formatPrice(
    Array.reduce(
      cart,
      0,
      (total, { item, quantity }) => total + item.price * quantity,
    ),
  )
