import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { Flags, init, view } from './main'

const flagsForRequest = (request: Request): Flags => ({
  initialCount: readCountCookie(request.headers.get('cookie') ?? ''),
})

export const renderPage = (
  request: Request,
): Promise<Server.ServerEntryResult> =>
  Effect.gen(function* () {
    const application = yield* Server.renderToString(
      { Flags, init, view },
      { flags: flagsForRequest(request) },
    )

    return Server.Rendered(application, {
      headers: {
        'cache-control': 'private, no-store',
        vary: 'cookie',
      },
    })
  }).pipe(Effect.runPromise)
