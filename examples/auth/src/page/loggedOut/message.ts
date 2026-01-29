import { Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

import * as Login from './page/login'

const LoginMessage = ts('LoginMessage', { message: Login.Message })

export const Message = S.Union(LoginMessage)

export type LoginMessage = typeof LoginMessage.Type
export type Message = typeof Message.Type

export { LoginMessage }
