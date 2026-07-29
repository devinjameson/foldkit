import { Duration, Effect } from 'effect'
import { Command } from 'foldkit'

import { FailedSubmitApplication, SucceededSubmitApplication } from './message'

// COMMAND

export const SubmitApplication = Command.define('SubmitApplication', {
  messages: [SucceededSubmitApplication, FailedSubmitApplication],
  execute: Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(1500))
    return SucceededSubmitApplication()
  }).pipe(
    Effect.catch(() =>
      Effect.succeed(FailedSubmitApplication({ error: 'Submission failed' })),
    ),
  ),
})
