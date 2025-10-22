import { Class, Html, OnClick, button, div } from 'foldkit/html'

// VIEW - Renders your state as HTML
// Pure function: same state always produces the same HTML - no side effects in
// the view

const view = (model: Model): Html =>
  div(
    [Class(containerStyle)],
    [
      div(
        [Class('text-6xl font-bold text-gray-800')],
        [model.toString()],
      ),
      div(
        [Class('flex flex-wrap justify-center gap-4')],
        [
          button(
            [OnClick(Decrement.make()), Class(buttonStyle)],
            ['-'],
          ),
          button(
            [OnClick(Reset.make()), Class(buttonStyle)],
            ['Reset'],
          ),
          button(
            [OnClick(Increment.make()), Class(buttonStyle)],
            ['+'],
          ),
        ],
      ),
    ],
  )

// STYLE

const containerStyle =
  'min-h-screen bg-white flex flex-col items-center justify-center gap-6 p-6'

const buttonStyle =
  'bg-black text-white hover:bg-gray-700 px-4 py-2 transition'
