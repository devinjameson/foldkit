import { inertHtml as ih } from 'foldkit/html'

import { ClickedReload } from './message'
import type { Model } from './model'

export const view = (model: Model) =>
  ih.div(
    [],
    [ih.button([ih.onClick(ClickedReload())], [ih.text(String(model.total))])],
  )
