import {
  Array,
  Number as Number_,
  Option,
  String as String_,
  pipe,
} from 'effect'

export const COUNT_COOKIE = 'foldkit-ssr-count'

const COUNT_COOKIE_PREFIX = `${COUNT_COOKIE}=`

/** Reads the persisted count out of a `Cookie` header (or `document.cookie`)
 *  string, falling back to zero. Shared by the server's per-request flags and
 *  the client's fallback `flags` Effect, so both sides derive the same
 *  starting count from the same source. */
export const readCountCookie = (cookieHeader: string): number =>
  pipe(
    cookieHeader,
    String_.split(';'),
    Array.map(String_.trim),
    Array.findFirst(String_.startsWith(COUNT_COOKIE_PREFIX)),
    Option.map(String_.slice(COUNT_COOKIE_PREFIX.length)),
    Option.flatMap(Number_.parse),
    Option.filter(Number.isSafeInteger),
    Option.getOrElse(() => 0),
  )
