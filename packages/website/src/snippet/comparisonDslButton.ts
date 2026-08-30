import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedSave: {},
})
type Message = typeof Message.Type

const saveButton = (isSaving: boolean, h: HtmlBuilder<Message>) =>
  h.button(
    [h.Type('button'), h.Disabled(isSaving), h.OnClick(Message.ClickedSave())],
    ['Save'],
  )
