import { inertHtml as ih } from 'foldkit/html'

// A shared module that lives inside the app view directory is shared code,
// not the composition root, so it stays available to a page.
import { Icon } from '../../../view/icon'

// The page's own update is its own module.
import { update } from '../update'

export const view = () => ih.div([], [Icon.copy(), String(update)])
