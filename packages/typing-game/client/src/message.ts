import { Schema as S } from 'effect'
import { Runtime, Url } from 'foldkit'
import { ts } from 'foldkit/schema'

import { Home, Room } from './page'

export const NoOp = ts('NoOp')
export const ClickedLink = ts('ClickedLink', {
  request: Runtime.UrlRequest,
})
export const ChangedUrl = ts('ChangedUrl', { url: Url.Url })
export const GotHomeMessage = ts('GotHomeMessage', { message: Home.Message.Message })
export const GotRoomMessage = ts('GotRoomMessage', { message: Room.Message.Message })

export const Message = S.Union(NoOp, ClickedLink, ChangedUrl, GotHomeMessage, GotRoomMessage)
export type Message = typeof Message.Type
