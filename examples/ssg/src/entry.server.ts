import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { init, view } from './main'

export const prerenderPaths: ReadonlyArray<string> = ['/', '/about']

export const renderPage = (
  request: Request,
): Promise<Server.ServerEntryResult> =>
  Server.renderToString({ routing: {}, init, view }, { url: request.url }).pipe(
    Effect.map(Server.Rendered),
    Effect.runPromise,
  )
