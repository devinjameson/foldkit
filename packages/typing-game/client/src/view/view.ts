import { Match as M } from 'effect'
import { Html } from 'foldkit/html'

import { Model } from '../model'
import { home } from './home'
import { notFound } from './notFound'
import { room } from './room'

export const view = (model: Model): Html =>
  M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: () => home(model),
      Room: ({ roomId }) => room(model, roomId),
      NotFound: ({ path }) => notFound(path),
    }),
  )
