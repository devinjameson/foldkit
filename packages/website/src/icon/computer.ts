import { Html } from 'foldkit/html'

import {
  AriaHidden,
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

export const computer = (className = 'w-5 h-5'): Html =>
  svg(
    [
      AriaHidden(true),
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
            'M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25',
          ),
        ],
        [],
      ),
    ],
  )
