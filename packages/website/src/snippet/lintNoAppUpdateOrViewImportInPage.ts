// sort-imports-ignore

// src/page/cart/view.ts

// ❌ Bad
// The app view renders this page, so the page importing it closes a cycle and
// drags the whole app into the page's own Scene tests.
import { layout } from '../../view'
// ❌ Bad
// The app update folds this page in. The same cycle, the other direction.
import { update as appUpdate } from '../../update'

// ✅ Good
// The app Router and a shared domain module carry no composition.
import { Cart } from '../../domain/cart'
import { productsRouter } from '../../route'
// ✅ Good
// A shared module that happens to live inside the app view directory is
// shared code, not the composition root.
import { Icon } from '../../view/icon'
