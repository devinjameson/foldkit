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

export const squareStack = (className: string = 'w-5 h-5'): Html =>
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
            'M6.429 9.75 2.25 12l9.75 5.25 9.75-5.25-4.179-2.25m-11.142 0 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75',
          ),
        ],
        [],
      ),
    ],
  )
