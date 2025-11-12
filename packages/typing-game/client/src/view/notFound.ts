import { Html } from 'foldkit/html'

import { homeRouter } from '../route'
import { Class, Href, a, div } from './html'

export const notFound = (path: string): Html =>
  div(
    [Class('min-h-screen p-12')],
    [
      div(
        [Class('max-w-4xl')],
        [
          div([Class('uppercase mb-6')], ['[Error] 404 - Path not found']),
          div([Class('uppercase mb-6')], [`[Invalid path] "${path}"`]),
          a(
            [
              Href(homeRouter.build({})),
              Class(
                'hover:bg-terminal-green hover:text-terminal-bg transition-all duration-200 inline-block',
              ),
            ],
            ['> Enter to go home'],
          ),
        ],
      ),
    ],
  )
