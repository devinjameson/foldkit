import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import * as Login from './page/login'

// MESSAGE

export const LoginMessage = ts('LoginMessage', { message: Login.Message })
export const Message = S.Union(LoginMessage)

export type LoginMessage = typeof LoginMessage.Type
export type Message = typeof Message.Type

// OUT MESSAGE

export const OutMessage = Login.OutMessage
export type OutMessage = typeof OutMessage.Type
