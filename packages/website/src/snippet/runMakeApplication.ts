import { Runtime } from 'foldkit'

const app = Runtime.makeApplication({
  Model,
  init, // receives (url: Url) => [Model, Commands]
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: (request) => LinkClicked({ request }),
    onUrlChange: (url) => UrlChanged({ url }),
  },
})

Runtime.run(app)
