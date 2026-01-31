import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { Session } from '../../domain/session'
import * as Login from './page/login'

// MESSAGE

export const LoginMessage = ts('LoginMessage', { message: Login.Message })
export const Message = S.Union(LoginMessage)

export type LoginMessage = typeof LoginMessage.Type
export type Message = typeof Message.Type

// OUT MESSAGE

export const LoginSucceeded = ts('LoginSucceeded', { session: Session })
export const OutMessage = S.Union(LoginSucceeded)

export type LoginSucceeded = typeof LoginSucceeded.Type
export type OutMessage = typeof OutMessage.Type
