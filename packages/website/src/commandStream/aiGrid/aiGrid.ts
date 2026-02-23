import { Effect, Stream } from 'effect'
import type { Command } from 'foldkit'
import type { CommandStream } from 'foldkit/runtime'

import type { CommandStreamsDeps, Message, Model } from '../../main'
import {
  AI_GRID_CANVAS_ID,
  HERO_GRID_CANVAS_ID,
} from '../../page/landing'
import { startAnimation } from './startAnimation'

const CANVAS_IDS = [HERO_GRID_CANVAS_ID, AI_GRID_CANVAS_ID]

export const aiGrid: CommandStream<
  Model,
  Message,
  CommandStreamsDeps['aiGrid']
> = {
  modelToDeps: (model: Model) => ({
    isLandingPage: model.route._tag === 'Home',
  }),
  depsToStream: ({ isLandingPage }) =>
    Stream.when(
      Stream.async<Command<Message>>(() => {
        const cleanups = CANVAS_IDS.map(id => {
          const canvas = document.getElementById(id)

          if (canvas instanceof HTMLCanvasElement) {
            return startAnimation(canvas)
          }
        })

        return Effect.sync(() => {
          cleanups.forEach(cleanup => cleanup?.())
        })
      }),
      () => isLandingPage,
    ),
}
