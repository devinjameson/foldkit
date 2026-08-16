import { Number as Number_, Option, Record, pipe } from 'effect'
import { Cookies } from 'effect/unstable/http'

export const COUNT_COOKIE = 'foldkit-ssr-count'

export const readCountCookie = (cookieHeader: string): number =>
  pipe(
    Cookies.parseHeader(cookieHeader),
    Record.get(COUNT_COOKIE),
    Option.flatMap(Number_.parse),
    Option.filter(Number.isSafeInteger),
    Option.getOrElse(() => 0),
  )
