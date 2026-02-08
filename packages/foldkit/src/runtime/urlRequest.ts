import { Schema as S } from 'effect'

import { Url } from '../url'

/** A URL request to a page within the application (same origin). */
export const Internal = S.TaggedStruct('Internal', {
  url: Url,
})
/** A URL request to a page within the application (same origin). */
export type Internal = typeof Internal.Type

/** A URL request to an external page (different origin). */
export const External = S.TaggedStruct('External', {
  href: S.String,
})
/** A URL request to an external page (different origin). */
export type External = typeof External.Type

/** Union of `Internal` and `External` URL request types. */
export const UrlRequest = S.Union(Internal, External)
/** Union of `Internal` and `External` URL request types. */
export type UrlRequest = typeof UrlRequest.Type
