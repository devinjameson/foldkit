import { Html } from 'foldkit/html'

import {
  Class,
  D,
  Fill,
  Stroke,
  StrokeLinecap,
  StrokeLinejoin,
  StrokeWidth,
  ViewBox,
  Xmlns,
  path,
  svg,
} from '../html'

export const shieldCheck = (className: string = 'w-5 h-5'): Html =>
  svg(
    [
      Class(className),
      Xmlns('http://www.w3.org/2000/svg'),
      Fill('none'),
      ViewBox('0 0 24 24'),
      StrokeWidth('1.5'),
      Stroke('currentColor'),
    ],
    [
      path(
        [
          StrokeLinecap('round'),
          StrokeLinejoin('round'),
          D(
            'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
          ),
        ],
        [],
      ),
    ],
  )
