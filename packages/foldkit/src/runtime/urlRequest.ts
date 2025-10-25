import { Schema as S } from 'effect'

import { Url } from '../url'

export const Internal = S.TaggedStruct('Internal', {
  url: Url,
})
export type Internal = typeof Internal.Type

export const External = S.TaggedStruct('External', {
  href: S.String,
})
export type External = typeof External.Type

export const UrlRequest = S.Union(Internal, External)
export type UrlRequest = typeof UrlRequest.Type
