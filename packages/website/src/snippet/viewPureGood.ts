import { Html, html } from 'foldkit/html'

import { Increment, Message } from './message'
import { Model } from './model'

const { button, div, h1, p, Class, OnClick } = html<Message>()

// ✅ View is just a pure function from Model to Html
const view = (model: Model): Html =>
  div(
    [Class('container')],
    [
      h1([], [model.title]),
      p([], [`Count: ${model.count}`]),
      button([OnClick(Increment())], ['+']),
    ],
  )
