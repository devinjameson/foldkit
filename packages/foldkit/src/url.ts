import { Option, Schema as S } from 'effect'

export const Url = S.Struct({
  protocol: S.String,
  host: S.String,
  port: S.OptionFromNullishOr(S.String, null),
  pathname: S.String,
  search: S.String,
  hash: S.String,
})
export type Url = S.Schema.Type<typeof Url>

export const toString = (url: Url): string => {
  const portString = Option.match(url.port, {
    onSome: (port) => `:${port}`,
    onNone: () => '',
  })
  return `${url.protocol}//${url.host}${portString}${url.pathname}${url.search}${url.hash}`
}
