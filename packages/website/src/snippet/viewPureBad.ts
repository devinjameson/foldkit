import type { Document, HtmlBuilder } from 'foldkit/html'

import type { Message } from './message'
import { Model } from './model'

// ❌ Don't do this in view
const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  // Fetching data in view
  fetch('/api/user').then(res => res.json())

  // Setting timers
  setTimeout(() => console.log('tick'), 1000)

  // Subscriptions
  window.addEventListener('resize', handleResize)

  return { title: 'Hello', body: h.div([], ['Hello']) }
}
