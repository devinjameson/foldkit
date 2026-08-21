import { Match as M, Schema as S } from 'effect'

const Idle = S.TaggedStruct('Idle', {})
const Loading = S.TaggedStruct('Loading', {})
const Failed = S.TaggedStruct('Failed', { error: S.String })
const Loaded = S.TaggedStruct('Loaded', { greeting: S.String })

const Status = S.Union([Idle, Loading, Failed, Loaded])
type Status = typeof Status.Type

function Greeting({ status }: { status: Status }) {
  return (
    <div>
      {M.value(status).pipe(
        M.tagsExhaustive({
          Idle: () => null,
          Loading: () => <p>Loading…</p>,
          Failed: ({ error }) => <p>Sorry: {error}</p>,
          Loaded: ({ greeting }) => <p>{greeting}</p>,
        }),
      )}
    </div>
  )
}
