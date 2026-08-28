import { Effect } from 'effect'
import { Mount } from 'foldkit'

import { CompletedMountAnalytics } from './message'

export const MountAnalytics = Mount.define('MountAnalytics', {
  messages: [CompletedMountAnalytics],
  execute: () => Effect.sync(() => startAnalytics()),
})
