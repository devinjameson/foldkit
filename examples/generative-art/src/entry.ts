import { Runtime } from 'foldkit'

import { overlay } from '@foldkit/devtools'

import { Message, Model, init, subscriptions, update, view } from './main'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root'),
  devTools: {
    overlay,
    Message,
    excludeFromHistory: [
      'TickedFrame',
      'MovedPointer',
      'CompletedGenerateAmbientParticle',
    ],
  },
})

Runtime.run(application)
