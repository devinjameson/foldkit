import { Runtime } from 'foldkit'

import { commandStreams } from './commandStreams'
import { init } from './init'
import { LinkClicked, UrlChanged } from './message'
import { Model } from './model'
import { update } from './update'
import { view } from './view'

const application = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  commandStreams,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: (request) => LinkClicked.make({ request }),
    onUrlChange: (url) => UrlChanged.make({ url }),
  },
})

Runtime.run(application)
