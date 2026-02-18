import { Effect, Stream } from 'effect'
import { Runtime } from 'foldkit'
import { CommandStream } from 'foldkit/runtime'

import {
  type CommandStreamsDeps,
  type Model,
  SystemThemeChanged,
} from '../main'

export const systemTheme: CommandStream<
  Model,
  SystemThemeChanged,
  CommandStreamsDeps['systemTheme']
> = {
  modelToDeps: (model: Model) => ({
    isSystemPreference: model.themePreference === 'System',
  }),
  depsToStream: ({ isSystemPreference }) =>
    Stream.when(
      Stream.async<Runtime.Command<SystemThemeChanged>>((emit) => {
        const mediaQuery = window.matchMedia(
          '(prefers-color-scheme: dark)',
        )

        const handler = (event: MediaQueryListEvent) => {
          emit.single(
            Effect.succeed(
              SystemThemeChanged({
                theme: event.matches ? 'Dark' : 'Light',
              }),
            ),
          )
        }

        mediaQuery.addEventListener('change', handler)

        return Effect.sync(() =>
          mediaQuery.removeEventListener('change', handler),
        )
      }),
      () => isSystemPreference,
    ),
}
