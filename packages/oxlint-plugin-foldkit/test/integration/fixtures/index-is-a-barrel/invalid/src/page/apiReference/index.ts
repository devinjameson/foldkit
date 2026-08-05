import { Array, Option, Record, pipe } from 'effect'

import { type ApiModule, moduleNameToSlug } from './domain'

// The barrel declares itself a barrel, then keeps two functions of its own. A
// reader of `ApiReference.` can no longer tell which file a symbol came from,
// and a sibling that wants `resolveModule` has to import the barrel that
// re-exports every other module beside it.
export * from './domain'
export { Model } from './model'
export { update } from './update'
export { view } from './view'

const modulesBySlug = (
  modules: ReadonlyArray<ApiModule>,
): Record<string, ApiModule> =>
  pipe(
    modules,
    Array.map(module => [moduleNameToSlug(module.name), module] as const),
    Record.fromEntries,
  )

export const resolveModule = (
  modules: ReadonlyArray<ApiModule>,
  slug: string,
): Option.Option<ApiModule> => Record.get(modulesBySlug(modules), slug)
