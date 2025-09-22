import {
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  init,
  propsModule,
  styleModule,
} from 'snabbdom'

export type { VNode } from 'snabbdom'

export const patch = init([
  attributesModule,
  classModule,
  datasetModule,
  eventListenersModule,
  propsModule,
  styleModule,
])
