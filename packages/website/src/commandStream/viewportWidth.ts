import { Effect, Stream } from 'effect'
import type { Command } from 'foldkit'
import { CommandStream } from 'foldkit/runtime'

import {
  ChangedViewportWidth,
  type CommandStreamsDeps,
  type Model,
  NARROW_VIEWPORT_QUERY,
} from '../main'

export const viewportWidth: CommandStream<
  Model,
  typeof ChangedViewportWidth,
  CommandStreamsDeps['viewportWidth']
> = {
  modelToDeps: () => null,
  depsToStream: () =>
    Stream.async<Command<typeof ChangedViewportWidth>>(emit => {
      const mediaQuery = window.matchMedia(NARROW_VIEWPORT_QUERY)

      const handler = (event: MediaQueryListEvent) => {
        emit.single(
          Effect.succeed(
            ChangedViewportWidth({ isNarrow: event.matches }),
          ),
        )
      }

      mediaQuery.addEventListener('change', handler)

      return Effect.sync(() =>
        mediaQuery.removeEventListener('change', handler),
      )
    }),
}
