import { inertHtml as ih } from 'foldkit/html'

// Its own page module, a shared domain module, and the app Router are all
// fine. Only a sibling page is out of bounds.
import { Cart } from '../../domain/cart'
import { productsRouter } from '../../route'

import { total } from './model'

export const view = (cart: Cart) =>
  ih.div([], [ih.a([ih.Href(productsRouter())], [String(total(cart))])])
