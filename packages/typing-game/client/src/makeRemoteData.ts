import { Schema as S } from 'effect'

export const makeRemoteData = <EA, EI, DA, DI>(
  error: S.Schema<EA, EI, never>,
  data: S.Schema<DA, DI, never>,
) => {
  const Loading = S.TaggedStruct('Loading', {})
  const Error = S.TaggedStruct('Error', { error })
  const Ok = S.TaggedStruct('Ok', { data })

  return {
    Loading,
    Error,
    Ok,
    Union: S.Union(Loading, Error, Ok),
  }
}
