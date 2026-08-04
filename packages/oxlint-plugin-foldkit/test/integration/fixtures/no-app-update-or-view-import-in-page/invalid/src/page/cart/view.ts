import { inertHtml as ih } from 'foldkit/html'

// The app view renders this page, so the page cannot render the app view.
import { layout } from '../../view'

export const view = () => layout(ih.div([], ['Cart']))
