import { Match, Schema } from 'effect'

const Idle = Schema.TaggedStruct('Idle', {})
const Loading = Schema.TaggedStruct('Loading', {})
const Failed = Schema.TaggedStruct('Failed', { error: Schema.String })
const Loaded = Schema.TaggedStruct('Loaded', { greeting: Schema.String })

const Status = Schema.Union([Idle, Loading, Failed, Loaded])
type Status = typeof Status.Type

function Greeting({ status }: { status: Status }) {
  return (
    <div>
      {Match.value(status).pipe(
        Match.tagsExhaustive({
          Idle: () => null,
          Loading: () => <p>Loading…</p>,
          Failed: ({ error }) => <p>Sorry: {error}</p>,
          Loaded: ({ greeting }) => <p>{greeting}</p>,
        }),
      )}
    </div>
  )
}
