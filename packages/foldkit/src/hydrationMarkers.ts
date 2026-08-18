// Hydration markers the serializer stamps onto a keyed or identity-bearing
// element, and hydration reads then strips. The server HTML does not otherwise
// encode a vnode's `key` or `identity`, so a reordered or stale keyed list would
// be adopted positionally: the client's first row would take over the DOM node
// (and the user state on it) of a different logical row. Serializing the markers
// lets hydration verify it is adopting the same logical entity by key and
// identity, not just by tag and position, and rebuild when it is not.
//
// A marker carries a digest of the key, never the key itself. Application keys
// are database ids, account identifiers, and email addresses the view otherwise
// never renders, and a compiler identity spells out a source path and function
// name; neither belongs in public HTML. A digest is a one-way comparison token:
// it is enough for hydration, which only ever asks whether two markers are
// equal, and it does not read back to the value it was computed from. It is not
// a secret, since a reader who guesses a candidate key can hash it and compare,
// so it is sized to make an accidental collision between two distinct keys
// vanishingly unlikely rather than to withstand a guessing attack.
//
// Markers are part of the hydration handoff, so they are emitted only for a
// hydratable render. Non-hydratable output carries no key or identity channel
// at all.

export const HYDRATION_KEY_ATTRIBUTE = 'data-foldkit-key'
export const HYDRATION_IDENTITY_ATTRIBUTE = 'data-foldkit-identity'

// FNV-1a, run as two 32-bit lanes from different offset bases and concatenated
// to 64 bits. The lanes are plain integer arithmetic over the string's code
// units, so the server and the browser compute the same digest for the same
// input with no platform dependency and no async crypto API.
const FNV_PRIME = 16777619
const FNV_OFFSET_BASIS = 2166136261
const SECOND_LANE_OFFSET_BASIS = 1099511628

const digest = (value: string): string => {
  let lowLane = FNV_OFFSET_BASIS
  let highLane = SECOND_LANE_OFFSET_BASIS
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    const lowByte = codeUnit & 0xff
    const highByte = codeUnit >>> 8
    lowLane = Math.imul(lowLane ^ lowByte, FNV_PRIME)
    lowLane = Math.imul(lowLane ^ highByte, FNV_PRIME)
    highLane = Math.imul(highLane ^ highByte, FNV_PRIME)
    highLane = Math.imul(highLane ^ lowByte, FNV_PRIME)
  }
  return (
    (lowLane >>> 0).toString(16).padStart(8, '0') +
    (highLane >>> 0).toString(16).padStart(8, '0')
  )
}

// Each digest is taken over a type-tagged string, which keeps the supported key
// types apart. The runtime compares keys with `===`, so the number 1 and the
// string '1' are different keys and must digest differently; untagged, both
// would reach the digest as "1" and a server-rendered numeric key would adopt a
// client string key's node, and the state on it.

/** The marker value for a vnode key, or `undefined` for a key type the
 *  hydration handoff does not support (a symbol, which the server refuses to
 *  render and hydration therefore never adopts).
 *
 * @internal
 */
export const hydrationKeyMarker = (key: PropertyKey): string | undefined => {
  if (typeof key === 'string') {
    return digest(`s:${key}`)
  }
  if (typeof key === 'number') {
    return digest(`n:${key}`)
  }
  return undefined
}

/** The marker value for a compiler-assigned view identity.
 *
 * @internal
 */
export const hydrationIdentityMarker = (identity: string): string =>
  digest(`i:${identity}`)
