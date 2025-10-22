import { Schema as S } from 'effect'

export const Url = S.Struct({
  protocol: S.String,
  host: S.String,
  port: S.OptionFromNullishOr(S.String, null),
  pathname: S.String,
  search: S.String,
  hash: S.String,
})
export type Url = S.Schema.Type<typeof Url>

export const Internal = S.TaggedStruct('Internal', {
  url: Url,
})
export type Internal = S.Schema.Type<typeof Internal>

export const External = S.TaggedStruct('External', {
  href: S.String,
})
export type External = S.Schema.Type<typeof External>

export const UrlRequest = S.Union(Internal, External)
export type UrlRequest = S.Schema.Type<typeof UrlRequest>
