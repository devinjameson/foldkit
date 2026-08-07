import { Match as M, Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { evo } from 'foldkit/struct'

import { describe, it } from '@effect/vitest'

import { view } from './index.js'

const Changed = m('Changed', { value: S.String })
const Message = S.Union([Changed])
type Message = typeof Message.Type

type Model = Readonly<{ value: string }>

type UpdateReturn = readonly [Model, ReadonlyArray<never>]

const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      Changed: ({ value }) => [evo(model, { value: () => value }), []],
    }),
  )

const testView =
  ({ isDisabled = false }: { isDisabled?: boolean } = {}) =>
  (model: Model, h: HtmlBuilder<Message>) =>
    view(
      {
        id: 'test',
        value: model.value,
        onChange: value => Changed({ value }),
        isDisabled,
        toView: ({ select, label }) =>
          h.div(
            [],
            [
              h.select([...select], [h.option([h.Value('a')], ['A'])]),
              h.label([...label], ['Choice']),
            ],
          ),
      },
      h,
    )

const field = Scene.role('combobox')

describe('Select controlled view', () => {
  it('is not interactive when disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.given({ value: 'a' }),
      Scene.expect(field).toBeDisabled(),
      Scene.expect(field).toHaveAttr('data-disabled', ''),
      Scene.expect(field).not.toHaveHandler('change'),
    )
  })

  it('carries the disabled state natively, without aria-disabled', () => {
    Scene.scene(
      { update, view: testView({ isDisabled: true }) },
      Scene.given({ value: 'a' }),
      Scene.expect(field).toBeDisabled(),
      Scene.expect(field).not.toHaveAttr('aria-disabled'),
    )
  })
})
