import { Schema as S } from 'effect'

export const makeRemoteData = <EA, EI, DA, DI>(
  error: S.Schema<EA, EI, never>,
  data: S.Schema<DA, DI, never>,
) => {
  const Idle = S.TaggedStruct('Idle', {})
  const Loading = S.TaggedStruct('Loading', {})
  const Error = S.TaggedStruct('Error', { error })
  const Ok = S.TaggedStruct('Ok', { data })

  return {
    Idle,
    Loading,
    Error,
    Ok,
    Union: S.Union(Idle, Loading, Error, Ok),
  }
}
