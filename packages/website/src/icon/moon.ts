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
  path,
  svg,
} from '../html'

export const moon = (className = 'w-5 h-5'): Html =>
  svg(
    [
      Class(className),
      ViewBox('0 0 24 24'),
      Fill('none'),
      Stroke('currentColor'),
      StrokeWidth('1.5'),
    ],
    [
      path(
        [
          StrokeLinecap('round'),
          StrokeLinejoin('round'),
          D(
            'M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z',
          ),
        ],
        [],
      ),
    ],
  )
