import { Schema as S } from 'effect'

import { Url } from '../url'

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
