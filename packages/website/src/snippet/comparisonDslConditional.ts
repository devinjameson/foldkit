import { Match, Schema } from 'effect'
import { inertHtml as ih } from 'foldkit/html'

const Idle = Schema.TaggedStruct('Idle', {})
const Loading = Schema.TaggedStruct('Loading', {})
const Failed = Schema.TaggedStruct('Failed', { error: Schema.String })
const Loaded = Schema.TaggedStruct('Loaded', { greeting: Schema.String })

const Status = Schema.Union([Idle, Loading, Failed, Loaded])
type Status = typeof Status.Type

const greetingView = (status: Status) =>
  ih.div(
    [],
    [
      Match.value(status).pipe(
        Match.tagsExhaustive({
          Idle: () => ih.empty,
          Loading: () => ih.p([], ['Loading…']),
          Failed: ({ error }) => ih.p([], [`Sorry: ${error}`]),
          Loaded: ({ greeting }) => ih.p([], [greeting]),
        }),
      ),
    ],
  )
