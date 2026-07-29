import { Effect, Option } from 'effect'
import { Command, File } from 'foldkit'

const SelectResume = Command.define('SelectResume', {
  messages: [SelectedResume, CancelledSelectResume],
  execute: File.select(['application/pdf']).pipe(
    Effect.map(
      Option.match({
        onNone: () => CancelledSelectResume(),
        onSome: file => SelectedResume({ file }),
      }),
    ),
  ),
})

const SelectAttachments = Command.define('SelectAttachments', {
  messages: [SelectedAttachments],
  execute: File.selectMultiple(['image/*', 'application/pdf']).pipe(
    Effect.map(files => SelectedAttachments({ files })),
  ),
})
