import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import { Session } from '../../domain/session'
import * as Login from './page/login'

// MESSAGE

export const GotLoginMessage = ts('GotLoginMessage', { message: Login.Message })
export const Message = S.Union(GotLoginMessage)
export type Message = typeof Message.Type

// OUT MESSAGE

export const SucceededLogin = ts('SucceededLogin', { session: Session })
export const OutMessage = S.Union(SucceededLogin)
export type OutMessage = typeof OutMessage.Type
