import { Effect } from 'effect'
import * as Server from 'foldkit/experimental/server'

import { readCountCookie } from './cookie'
import { Flags, init, view } from './main'

const flagsForRequest = (cookieHeader: string): Flags => ({
  initialCount: readCountCookie(cookieHeader),
  renderedAt: new Date().toISOString(),
  renderedOn: 'Server',
})

/** Renders one request. The host (the dev server plugin, or `server/main.ts`
 *  in production) passes the request and places the returned markup into the
 *  HTML template; the flags produced here ride along in the payload script,
 *  so the hydrating client calls `init` with exactly the values this render
 *  used. The boundary is a `Promise` because the host holds a different
 *  module graph than this bundle, so the render's Effect runs to completion
 *  here and only the settled result crosses the seam. */
export const renderPage = (
  request: Request,
): Promise<Server.RenderedApplication> =>
  Effect.runPromise(
    Server.renderToString(
      { Flags, init, view },
      { flags: flagsForRequest(request.headers.get('cookie') ?? '') },
    ),
  )
