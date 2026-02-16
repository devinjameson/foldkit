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

export type NoOp = typeof NoOp.Type
export type LinkClicked = typeof LinkClicked.Type
export type UrlChanged = typeof UrlChanged.Type
export type GotHomeMessage = typeof GotHomeMessage.Type
export type GotRoomMessage = typeof GotRoomMessage.Type

export const Message = S.Union(NoOp, LinkClicked, UrlChanged, GotHomeMessage, GotRoomMessage)
export type Message = typeof Message.Type
