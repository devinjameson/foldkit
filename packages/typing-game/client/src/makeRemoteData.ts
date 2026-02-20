import { Schema as S } from 'effect'
import { m } from 'foldkit/schema'

export const makeRemoteData = <EA, EI, DA, DI>(
  error: S.Schema<EA, EI, never>,
  data: S.Schema<DA, DI, never>,
) => {
  const Idle = m('Idle')
  const Loading = m('Loading')
  const Error = m('Error', { error })
  const Ok = m('Ok', { data })

  return {
    Idle,
    Loading,
    Error,
    Ok,
    Union: S.Union(Idle, Loading, Error, Ok),
  }
}
