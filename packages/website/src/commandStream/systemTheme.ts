import { Effect, Stream } from 'effect'
import { Runtime } from 'foldkit'
import { CommandStream } from 'foldkit/runtime'

import {
  ChangedSystemTheme,
  type CommandStreamsDeps,
  type Model,
} from '../main'

export const systemTheme: CommandStream<
  Model,
  typeof ChangedSystemTheme,
  CommandStreamsDeps['systemTheme']
> = {
  modelToDeps: (model: Model) => ({
    isSystemPreference: model.themePreference === 'System',
  }),
  depsToStream: ({ isSystemPreference }) =>
    Stream.when(
      Stream.async<Runtime.Command<typeof ChangedSystemTheme>>(
        emit => {
          const mediaQuery = window.matchMedia(
            '(prefers-color-scheme: dark)',
          )

          const handler = (event: MediaQueryListEvent) => {
            emit.single(
              Effect.succeed(
                ChangedSystemTheme({
                  theme: event.matches ? 'Dark' : 'Light',
                }),
              ),
            )
          }

          mediaQuery.addEventListener('change', handler)

          return Effect.sync(() =>
            mediaQuery.removeEventListener('change', handler),
          )
        },
      ),
      () => isSystemPreference,
    ),
}
