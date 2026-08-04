// sort-imports-ignore

// src/page/cart/view.ts

// ❌ Bad
// The Cart page reaches into the Products page, which couples two routes and
// leaves neither page testable on its own.
import { productRow } from '../products/view'
// ❌ Bad
// The page barrel re-exports every page, so importing it drags in the siblings
// and this page along with them.
import { Products } from '../index'

// ✅ Good
// What both pages need moves to a shared module, and the app Router stays
// available to every page.
import { Cart } from '../../domain/cart'
import { productsRouter } from '../../route'
// ✅ Good
// Reaching inside its own page module is what a page folder is for.
import { total } from './model'
