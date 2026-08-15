import { Effect, Option, Schema as S, Stream } from 'effect'
import { Subscription } from 'foldkit'

import type { Message } from './message'
import {
  ClickedRedo,
  ClickedUndo,
  ReleasedMouse,
  SelectedTool,
} from './message'
import type { Model } from './model'

const toUndoRedoMessage = (event: KeyboardEvent): Option.Option<Message> => {
  const isCtrlOrMeta = event.ctrlKey || event.metaKey
  if (!isCtrlOrMeta) {
    return Option.none()
  }

  const key = event.key.toLowerCase()
  if (key === 'z') {
    return Option.some(event.shiftKey ? ClickedRedo() : ClickedUndo())
  }
  if (key === 'y') {
    return Option.some(ClickedRedo())
  }
  return Option.none()
}

const toToolMessage = (event: KeyboardEvent): Option.Option<Message> => {
  if (event.ctrlKey || event.metaKey) {
    return Option.none()
  }

  const key = event.key.toLowerCase()
  if (key === 'b') {
    return Option.some(SelectedTool({ tool: 'Brush' }))
  }
  if (key === 'f') {
    return Option.some(SelectedTool({ tool: 'Fill' }))
  }
  if (key === 'e') {
    return Option.some(SelectedTool({ tool: 'Eraser' }))
  }
  return Option.none()
}

export const subscriptions = Subscription.make<Model, Message>()(entry => ({
  undoRedoKeys: Subscription.persistent(
    Subscription.fromEventPreventDefault<KeyboardEvent, Message>({
      target: document,
      type: 'keydown',
      toMessage: toUndoRedoMessage,
    }),
  ),

  toolKeys: Subscription.persistent(
    Subscription.fromEventFilterMap<KeyboardEvent, Message>({
      target: document,
      type: 'keydown',
      toMessage: toToolMessage,
    }),
  ),

  mouseRelease: entry(
    { isDrawing: S.Boolean },
    {
      modelToDependencies: model => ({ isDrawing: model.isDrawing }),
      dependenciesToStream: ({ isDrawing }) =>
        Stream.when(
          Stream.fromEventListener(document, 'mouseup').pipe(
            Stream.map(() => ReleasedMouse()),
          ),
          Effect.sync(() => isDrawing),
        ),
    },
  ),
}))
