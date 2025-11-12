import { Html } from 'foldkit/html'

import { homeRouter } from '../route'
import { Class, Href, a, div } from './html'

export const notFound = (path: string): Html =>
  div(
    [Class('min-h-screen flex items-start p-8')],
    [
      div(
        [Class('max-w-4xl')],
        [
          div([Class('uppercase mb-6')], ['[ERROR] 404 - PATH NOT FOUND']),
          div([Class('h-px bg-terminal-green my-6')], []),
          div([Class('mb-6')], [`[INVALID PATH] "${path}"`]),
          div([Class('mb-4')], ['The requested path does not exist in this terminal.']),
          div([Class('h-px bg-terminal-green my-6')], []),
          a(
            [
              Href(homeRouter.build({})),
              Class(
                'border-2 border-terminal-green px-6 py-3 uppercase hover:bg-terminal-green hover:text-terminal-bg transition-all duration-200 inline-block',
              ),
            ],
            ['> RETURN TO HOME'],
          ),
        ],
      ),
    ],
  )
