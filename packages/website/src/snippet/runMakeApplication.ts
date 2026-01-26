import { Runtime } from 'foldkit'

const app = Runtime.makeApplication({
  Model,
  init, // receives (url: Url) => [Model, Commands]
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: (request) => LinkClicked.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(app)
