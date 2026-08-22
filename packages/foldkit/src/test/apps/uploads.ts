import { Array, Effect, Match as M, Number, Schema as S } from 'effect'

import * as Command from '../../command/index.js'
import * as Interruptible from '../../command/interruptible/index.js'
import type { Document, HtmlBuilder } from '../../html/index.js'
import { defineMessageUnion } from '../../message/index.js'
import { evo } from '../../struct/index.js'

// MODEL

export const UploadStatus = S.Literals([
  'Uploading',
  'Done',
  'Cancelled',
  'Failed',
])
export type UploadStatus = typeof UploadStatus.Type

export const Upload = S.Struct({
  id: S.Number,
  status: UploadStatus,
})
export type Upload = typeof Upload.Type

export const Model = S.Struct({
  uploadId: S.Number,
  uploads: S.Array(Upload),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedStartUpload: {},
  ClickedRetryUpload: { uploadId: S.Number },
  ClickedCancelUpload: { uploadId: S.Number },
  SucceededUploadFile: { uploadId: S.Number },
  FailedUploadFile: { uploadId: S.Number },
  CompletedCancelUploadFile: {
    uploadId: S.Number,
    outcome: Interruptible.Outcome,
  },
})

export type Message = typeof Message.Type

// COMMAND

export const UploadFileArgs = S.Struct({ uploadId: S.Number })
export type UploadFileArgs = typeof UploadFileArgs.Type

export const UploadFile = Command.define('UploadFile', {
  args: UploadFileArgs.fields,
  messages: [Message.SucceededUploadFile, Message.FailedUploadFile],
  interrupt: {
    keyFields: ['uploadId'],
    toKey: ({ uploadId }) => String(uploadId),
  },
  execute: ({ uploadId }) =>
    Effect.as(Effect.never, Message.SucceededUploadFile({ uploadId })),
})

export const CancelUploadFile = ({ uploadId }: UploadFileArgs) =>
  UploadFile.Interrupt({ uploadId }, outcome =>
    Message.CompletedCancelUploadFile({ uploadId, outcome }),
  )

// INIT

export const initialModel: Model = { uploadId: 0, uploads: [] }

// UPDATE

const setStatusById = (uploadId: number, status: UploadStatus) =>
  Array.map((upload: Upload) =>
    upload.id === uploadId ? evo(upload, { status: () => status }) : upload,
  )

export const update = (model: Model, message: Message) =>
  Message.match<readonly [Model, ReadonlyArray<Command.Command<Message>>]>(
    message,
    {
      ClickedStartUpload: () => {
        const startedUpload: Upload = {
          id: model.uploadId,
          status: 'Uploading',
        }
        return [
          evo(model, {
            uploadId: Number.increment,
            uploads: Array.append(startedUpload),
          }),
          [UploadFile({ uploadId: model.uploadId })],
        ]
      },
      ClickedRetryUpload: ({ uploadId }) => [
        evo(model, { uploads: setStatusById(uploadId, 'Uploading') }),
        [UploadFile({ uploadId })],
      ],
      ClickedCancelUpload: ({ uploadId }) => [
        model,
        [CancelUploadFile({ uploadId })],
      ],
      SucceededUploadFile: ({ uploadId }) => [
        evo(model, { uploads: setStatusById(uploadId, 'Done') }),
        [],
      ],
      FailedUploadFile: ({ uploadId }) => [
        evo(model, { uploads: setStatusById(uploadId, 'Failed') }),
        [],
      ],
      CompletedCancelUploadFile: ({ uploadId, outcome }) =>
        M.value(outcome).pipe(
          M.withReturnType<
            readonly [Model, ReadonlyArray<Command.Command<Message>>]
          >(),
          M.tagsExhaustive({
            Interrupted: () => [
              evo(model, { uploads: setStatusById(uploadId, 'Cancelled') }),
              [],
            ],
            NotFound: () => [model, []],
          }),
        ),
    },
  )

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const body = h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedStartUpload())], ['Start upload']),
      h.ul(
        [],
        Array.map(model.uploads, upload =>
          h.keyed('li')(
            String(upload.id),
            [],
            [
              h.span([], [`upload ${upload.id}: ${upload.status}`]),
              h.button(
                [
                  h.OnClick(
                    Message.ClickedCancelUpload({ uploadId: upload.id }),
                  ),
                ],
                [`Cancel upload ${upload.id}`],
              ),
            ],
          ),
        ),
      ),
    ],
  )

  return { title: 'Uploads', body }
}
