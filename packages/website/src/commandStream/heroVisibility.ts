import { Effect, Stream } from 'effect'
import type { Command } from 'foldkit'
import { CommandStream } from 'foldkit/runtime'

import {
  ChangedHeroVisibility,
  type CommandStreamsDeps,
  type Model,
} from '../main'
import { HERO_SECTION_ID } from '../page/landing'

export const heroVisibility: CommandStream<
  Model,
  typeof ChangedHeroVisibility,
  CommandStreamsDeps['heroVisibility']
> = {
  modelToDeps: (model: Model) => ({
    isLandingPage: model.route._tag === 'Home',
  }),
  depsToStream: ({ isLandingPage }) =>
    Stream.when(
      Stream.async<Command<typeof ChangedHeroVisibility>>(emit => {
        const heroElement = document.getElementById(HERO_SECTION_ID)

        if (!heroElement) {
          return Effect.void
        }

        const observer = new IntersectionObserver(
          entries => {
            const entry = entries[0]
            if (entry) {
              emit.single(
                Effect.succeed(
                  ChangedHeroVisibility({
                    isVisible: entry.isIntersecting,
                  }),
                ),
              )
            }
          },
          { threshold: 0 },
        )

        observer.observe(heroElement)

        return Effect.sync(() => observer.disconnect())
      }),
      () => isLandingPage,
    ),
}
