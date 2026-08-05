import { inertHtml as ih } from 'foldkit/html'

import { type Model, total } from './model'

// A named file beside the barrel is where code belongs, however much of it
// there is.
export const view = (model: Model) => ih.div([], [String(total(model))])
