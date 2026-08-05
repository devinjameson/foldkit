// A domain barrel mixes the two re-export forms: a flat one for the module it
// is named after, a namespace for each child.
export * from './cart'
export * as Item from './item'
export type { Money } from './money'
