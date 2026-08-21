import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Slider } from '@foldkit/ui'

const generatedParticleFields = {
  x: S.Number,
  y: S.Number,
  baseHue: S.Number,
  hueDriftPerSecond: S.Number,
  lifespanMs: S.Number,
  speed: S.Number,
  initialAngle: S.Option(S.Number),
  initialSpeedScale: S.Number,
}

export const Message = defineMessageUnion({
  TickedFrame: { deltaTimeMs: S.Number },
  CompletedGenerateAmbientParticle: generatedParticleFields,
  CompletedGenerateBurstParticle: generatedParticleFields,
  PressedCanvas: {
    x: S.Number,
    y: S.Number,
  },
  MovedPointer: {
    x: S.Number,
    y: S.Number,
  },
  ClickedTogglePlay: {},
  ClickedReset: {},
  GotFlowStrengthSliderMessage: { message: Slider.Message },
  GotNoiseScaleSliderMessage: { message: Slider.Message },
})

export type Message = typeof Message.Type
