import { Runtime } from 'foldkit'

import { Flags, Model, flags, init, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  Flags,
  flags,
  container: document.getElementById('root'),
})

Runtime.run(application)
