// sort-imports-ignore

import { Runtime } from 'foldkit'

// src/main.ts

// ❌ Bad
// The runtime starts as a side effect of importing this module, so a test that
// only wants `update` gets a running application, a DOM, and every boot Command.
export const badApplication = Runtime.makeApplication({ init, update, view })
Runtime.run(badApplication)

// ✅ Good
// `main.ts` defines and exports. Building an application description starts
// nothing, so the module stays importable.
export const application = Runtime.makeApplication({ init, update, view })

// src/entry.ts

// ✅ Good
// The entry module boots and exports nothing. It is the one place a runtime
// starts, and nothing imports it.
Runtime.run(application)
