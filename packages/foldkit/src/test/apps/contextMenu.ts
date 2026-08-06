import { Match as M, Schema as S } from 'effect'

import type { Html, HtmlBuilder } from '../../html/index.js'
import { m } from '../../message/index.js'

// MODEL

const ContextMenuState = S.Union([
  S.TaggedStruct('Closed', {}),
  S.TaggedStruct('Open', {
    source: S.Literals(['Direct', 'Inner', 'Outer']),
  }),
])
type ContextMenuState = typeof ContextMenuState.Type

export const Model = S.Struct({
  contextMenu: ContextMenuState,
  openCount: S.Number,
})
export type Model = typeof Model.Type

// MESSAGE

const OpenedContextMenu = m('OpenedContextMenu', {
  source: S.Literals(['Direct', 'Inner', 'Outer']),
})

const Message = S.Union([OpenedContextMenu])
type Message = typeof Message.Type

// INIT

export const initialModel: Model = {
  contextMenu: { _tag: 'Closed' },
  openCount: 0,
}

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<never>] =>
  M.value(message).pipe(
    M.withReturnType<readonly [Model, ReadonlyArray<never>]>(),
    M.tagsExhaustive({
      OpenedContextMenu: ({ source }) => [
        {
          contextMenu: { _tag: 'Open', source },
          openCount: model.openCount + 1,
        },
        [],
      ],
    }),
  )

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const maybeContextMenu = M.value(model.contextMenu).pipe(
    M.tagsExhaustive({
      Closed: () => null,
      Open: ({ source }) =>
        h.div(
          [h.Role('menu'), h.AriaLabel(`${source} context menu`)],
          [`${source} context menu opens=${model.openCount}`],
        ),
    }),
  )

  return h.div(
    [],
    [
      h.section(
        [
          h.AriaLabel('outer context area'),
          h.OnContextMenu(OpenedContextMenu({ source: 'Outer' })),
        ],
        [
          h.span([h.AriaLabel('outer target')], ['Outer target']),
          h.div(
            [
              h.AriaLabel('inner context area'),
              h.OnContextMenu(OpenedContextMenu({ source: 'Inner' })),
            ],
            [
              h.span([h.AriaLabel('nearest target')], ['Nearest target']),
              h.button(
                [
                  h.AriaLabel('direct target'),
                  h.OnContextMenu(OpenedContextMenu({ source: 'Direct' })),
                ],
                ['Direct target'],
              ),
            ],
          ),
        ],
      ),
      h.span([h.AriaLabel('no handler')], ['No handler']),
      maybeContextMenu,
    ],
  )
}
