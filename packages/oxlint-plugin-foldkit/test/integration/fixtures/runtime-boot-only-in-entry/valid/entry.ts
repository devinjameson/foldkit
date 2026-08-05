import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import { Message, Model, init, update, view } from './main'

// The entry module is the one place a boot belongs. It exports nothing, so
// nothing imports it, and the runtime starts only when the page loads it.

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root'),
  devTools: {
    overlay,
    Message,
  },
})

Runtime.run(application)
