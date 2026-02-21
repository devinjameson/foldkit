import { Runtime } from 'foldkit'

const app = Runtime.makeApplication({
  Model,
  init, // receives (url: Url) => [Model, Commands]
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(app)
