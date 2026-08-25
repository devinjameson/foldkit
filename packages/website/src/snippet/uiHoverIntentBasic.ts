// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option, Schema as S } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { HoverIntent } from '@foldkit/ui'

// Add a field to your Model:
const Model = S.Struct({
  hoverIntent: HoverIntent.Model,
  // ...your other fields
})

// Initialize it. This behavior primitive owns no DOM id:
const init = () => ({
  model: {
    hoverIntent: HoverIntent.init({ openDelay: 200, closeDelay: 300 }),
    // ...your other fields
  },
})

// Embed child Messages in your parent Message:
const Message = defineMessageUnion({
  GotHoverIntentMessage: { message: HoverIntent.Message },
})

const foldHoverIntentOutMessage = M.type<HoverIntent.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  }),
)

const foldHoverIntent = Update.foldChild({
  update: HoverIntent.update,
  read: model => Option.some(model.hoverIntent),
  write: (model, nextHoverIntent) =>
    evo(model, { hoverIntent: () => nextHoverIntent }),
  toParentMessage: message => Message.GotHoverIntentMessage({ message }),
  foldOutMessage: foldHoverIntentOutMessage,
})

GotHoverIntentMessage: ({ message }) => foldHoverIntent(model, message)

// Spread trigger attributes on the activator. Spread panel attributes on the
// content. Hover Intent owns events only, so this component chooses the role,
// anchor, and styles around those elements.
const view = (h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'account-preview',
    model: model.hoverIntent,
    view: HoverIntent.view,
    viewInputs: {
      toView: ({ trigger, panel, isVisible }) =>
        h.div(
          [],
          [
            h.button([...trigger], ['Preview account']),
            ...(isVisible
              ? [
                  h.div(
                    [...panel],
                    [h.a([h.Href('/account')], ['Open account'])],
                  ),
                ]
              : []),
          ],
        ),
    },
    toParentMessage: message => Message.GotHoverIntentMessage({ message }),
  })
