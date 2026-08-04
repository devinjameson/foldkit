import { inertHtml as ih } from 'foldkit/html'

// The app Router and a shared domain module carry no composition, so a page
// imports them freely.
import { Cart } from '../../domain/cart'
import { productsRouter } from '../../route'

export const view = (cart: Cart) =>
  ih.a([ih.Href(productsRouter())], [String(cart.itemCount)])
