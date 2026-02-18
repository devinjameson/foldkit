import { Schema as S } from 'effect'
import { Runtime, Url } from 'foldkit'
import { ts } from 'foldkit/schema'

import { Home, Room } from './page'

export const NoOp = ts('NoOp')
export const LinkClicked = ts('LinkClicked', {
  request: Runtime.UrlRequest,
})
export const UrlChanged = ts('UrlChanged', { url: Url.Url })
export const GotHomeMessage = ts('GotHomeMessage', { message: Home.Message.Message })
export const GotRoomMessage = ts('GotRoomMessage', { message: Room.Message.Message })

export const Message = S.Union(NoOp, LinkClicked, UrlChanged, GotHomeMessage, GotRoomMessage)
export type Message = typeof Message.Type
