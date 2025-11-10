import { Html } from 'foldkit/html'

import { div } from '../html'
import { heading, para } from '../prose'

export const view = (): Html =>
  div(
    [],
    [
      heading(1, 'bestPractices', 'Best Practices'),
      para(
        'Learn patterns and practices for building maintainable Foldkit applications.',
      ),
    ],
  )
