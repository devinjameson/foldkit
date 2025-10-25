import {
  Class,
  D,
  Fill,
  Html,
  Stroke,
  StrokeLinecap,
  StrokeLinejoin,
  StrokeWidth,
  ViewBox,
  Xmlns,
  path,
  svg,
} from 'foldkit/html'

export const menu = (className: string = 'w-6 h-6'): Html =>
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
          D('M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'),
        ],
        [],
      ),
    ],
  )
