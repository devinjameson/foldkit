import { Effect } from 'effect'
import { Server } from 'foldkit/experimental'

import { readCountCookie } from './cookie'
import { Flags, init, view } from './main'

const flagsForRequest = (cookieHeader: string): Flags => ({
  initialCount: readCountCookie(cookieHeader),
  renderedAt: new Date().toISOString(),
  renderedOn: 'Server',
})

// NOTE: the Flags built from this request are serialized into the rendered
// HTML and travel to the browser with it. The hydrating client reads them
// back and calls init with the exact values this render used; the client
// computes no Flags of its own.
export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Effect.runPromise(
    Effect.gen(function* () {
      const renderedApplication = yield* Server.renderToString(
        { Flags, init, view },
        { flags: flagsForRequest(request.headers.get('cookie') ?? '') },
      )

      return Server.Rendered(renderedApplication, {
        headers: {
          'cache-control': 'private, no-store',
          vary: 'cookie',
          'x-content-type-options': 'nosniff',
        },
      })
    }),
  )
