import { Struct } from 'effect'

type EvolveTransform<O> = Partial<{
  [K in keyof O]: (a: O[K]) => O[K]
}>

type StrictKeys<O, T> =
  T extends Record<string, any>
    ? Exclude<keyof T, keyof O> extends never
      ? T
      : T & {
          [K in `Invalid key: ${Exclude<keyof T, keyof O> & string}`]: never
        }
    : never

type Evolved<O, T> = {
  [K in keyof O]: K extends keyof T
    ? T[K] extends (a: any) => infer R
      ? R
      : O[K]
    : O[K]
}

/** Immutably updates fields of a struct by applying transform functions. Wraps Effect's `Struct.evolve` with stricter key checking. */
export const evo: {
  <O, const T extends EvolveTransform<O>>(
    t: StrictKeys<O, T>,
  ): (obj: O) => Evolved<O, T>
  <O, const T extends EvolveTransform<O>>(
    obj: O,
    t: StrictKeys<O, T>,
  ): Evolved<O, T>
} = Struct.evolve
