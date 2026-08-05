// sort-imports-ignore

import { Command } from 'foldkit'
import { m } from 'foldkit/message'

// src/page/cart/view.ts

// ❌ Bad
// A Message declared in the view splits the page's vocabulary in two. Whoever
// reads `message.ts` to find every event the update handles will miss it.
export const ClickedClearCartInView = m('ClickedClearCart')

// ❌ Bad
// Same for a Command declared in the view.
export const FetchCartInView = Command.define('FetchCart', {
  execute: fetchCart,
})

// src/page/cart/message.ts

// ✅ Good
export const ClickedClearCart = m('ClickedClearCart')

// src/page/cart/update.ts

// ✅ Good
// A Command may also sit in `update.ts`, since Commands live beside the update
// function that returns them.
export const FetchCart = Command.define('FetchCart', { execute: fetchCart })

// src/main.ts

// ✅ Good
// An app that has not split into role files yet claims no role, so nothing here
// is reported.
export const ClickedClearCartInMain = m('ClickedClearCart')
