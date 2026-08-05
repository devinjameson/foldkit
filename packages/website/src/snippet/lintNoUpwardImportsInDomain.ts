// sort-imports-ignore

// src/domain/cart.ts

// ❌ Bad
// The domain is the bottom layer. Reaching into a page pins a shared concept to
// one route, and reaching for the app update means this module cannot be tested
// without the application around it.
import { CartRow } from '../page/cart/view'
import { update } from '../update'

// ✅ Good
// A sibling domain module, and a shared module that happens to live inside a
// role directory, are both ordinary downward imports.
import { Item } from './item'
import { Icon } from '../view/icon'
