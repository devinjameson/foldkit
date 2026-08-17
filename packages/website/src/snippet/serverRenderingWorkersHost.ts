import { Server } from 'foldkit/experimental'

import template from './dist/client/index.html'
import { renderPage } from './dist/server/entry.server'

export default {
  fetch: async (request: Request): Promise<Response> =>
    Server.toResponse(template, await renderPage(request)),
}
