import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { Session } from '../../domain/session'
import * as Login from './page/login'

// MESSAGE

export const GotLoginMessage = ts('GotLoginMessage', { message: Login.Message })
export const Message = S.Union(GotLoginMessage)

export type GotLoginMessage = typeof GotLoginMessage.Type
export type Message = typeof Message.Type

// OUT MESSAGE

export const LoginSucceeded = ts('LoginSucceeded', { session: Session })
export const OutMessage = S.Union(LoginSucceeded)

export type LoginSucceeded = typeof LoginSucceeded.Type
export type OutMessage = typeof OutMessage.Type
