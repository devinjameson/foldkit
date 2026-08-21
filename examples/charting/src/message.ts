import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { RadioGroup } from '@foldkit/ui'

import { Telemetry } from './domain'

export const Message = defineMessageUnion({
  GotChartModeRadioGroupMessage: { message: RadioGroup.Message },
  GotPackageRadioGroupMessage: { message: RadioGroup.Message },
  GotPeriodRadioGroupMessage: { message: RadioGroup.Message },
  ClickedRefresh: {},
  ClickedRetry: {},
  ClickedChartDatum: { datumId: S.String },
  SucceededFetchTelemetry: { telemetry: Telemetry },
  FailedFetchTelemetry: { error: S.String },
  SucceededMountChart: { hostId: S.String },
  FailedMountChart: { reason: S.String },
  SucceededSyncChart: {},
  FailedSyncChart: { reason: S.String },
})

export type Message = typeof Message.Type
