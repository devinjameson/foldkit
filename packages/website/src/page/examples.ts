import { Html } from 'foldkit/html'

import { div } from '../html'
import { heading, para } from '../prose'

export const view = (): Html =>
  div(
    [],
    [
      heading(1, 'examples', 'Examples'),
      para('Explore real-world examples built with Foldkit.'),
    ],
  )
