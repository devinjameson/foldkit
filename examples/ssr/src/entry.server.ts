import { Effect } from 'effect'
import * as Server from 'foldkit/experimental/server'

import { readCountCookie } from './cookie'
import { Flags, init, view } from './main'

const flagsForRequest = (cookieHeader: string): Flags => ({
  initialCount: readCountCookie(cookieHeader),
  renderedAt: new Date().toISOString(),
  renderedOn: 'Server',
})

/** Renders one request. The host passes the request's `Cookie` header and
 *  places the returned markup into the HTML template; the flags produced
 *  here ride along in the payload script, so the hydrating client calls
 *  `init` with exactly the values this render used. Rendering lives in this
 *  module's graph so the server host never loads a second copy of Foldkit
 *  alongside the bundled one. */
export const renderPage = (
  cookieHeader: string,
): Effect.Effect<Server.RenderedApplication, Server.ServerRenderError> =>
  Server.renderToString(
    { Flags, init, view },
    { flags: flagsForRequest(cookieHeader) },
  )
