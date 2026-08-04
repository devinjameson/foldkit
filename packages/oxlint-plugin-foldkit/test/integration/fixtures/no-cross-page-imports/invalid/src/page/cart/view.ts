import { inertHtml as ih } from 'foldkit/html'

// The Cart page reaches into the Products page for a view helper, which
// couples two routes that the app is supposed to compose independently.
import { productRow } from '../products/view'

export const view = () => ih.div([], [productRow()])
