import { Match as M, Schema as S } from 'effect'
import { inertHtml as ih } from 'foldkit/html'

const Idle = S.TaggedStruct('Idle', {})
const Loading = S.TaggedStruct('Loading', {})
const Failed = S.TaggedStruct('Failed', { error: S.String })
const Loaded = S.TaggedStruct('Loaded', { greeting: S.String })

const Status = S.Union([Idle, Loading, Failed, Loaded])
type Status = typeof Status.Type

const greetingView = (status: Status) =>
  ih.div(
    [],
    [
      M.value(status).pipe(
        M.tagsExhaustive({
          Idle: () => ih.empty,
          Loading: () => ih.p([], ['Loading…']),
          Failed: ({ error }) => ih.p([], [`Sorry: ${error}`]),
          Loaded: ({ greeting }) => ih.p([], [greeting]),
        }),
      ),
    ],
  )
