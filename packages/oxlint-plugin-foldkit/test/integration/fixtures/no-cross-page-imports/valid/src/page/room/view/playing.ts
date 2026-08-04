import { inertHtml as ih } from 'foldkit/html'

// A page splits into subfolders as it grows, and reaching back up inside its
// own module stays within the page.
import { Model } from '../../model'

export const playing = (model: Model) => ih.div([], [model.word])
