import type { Html, HtmlBuilder } from 'foldkit/html'

// Wrong: the key restates the data the panel displays, so every toggle
// changes the key, tears the panel down, and rebuilds it from scratch
const reviewPanelKeyedByData = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.keyed('div')(
    `${model.isCardSelected}:${model.isTermsAccepted}`,
    [],
    [reviewContentView(model, h)],
  )

// Right: the panel is the same thing on every render, so it carries no
// key, and the toggled content patches in place
const reviewPanel = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.div([], [reviewContentView(model, h)])
