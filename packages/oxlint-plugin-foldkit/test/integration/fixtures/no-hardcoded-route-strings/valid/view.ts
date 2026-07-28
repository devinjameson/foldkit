import { staticHtml as h } from 'foldkit/html'

import { tasksRouter } from './route'

export const tasksLink = h.a([h.Href(tasksRouter())], ['Tasks'])
