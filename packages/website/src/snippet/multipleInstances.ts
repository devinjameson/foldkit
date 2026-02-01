import { Schema as S } from 'effect'

import * as Accordion from './accordion'

// Fixed number of instances
const ModelA = S.Struct({
  accordion1: Accordion.Model,
  accordion2: Accordion.Model,
  accordion3: Accordion.Model,
})

// Dynamic number of instances
const ModelB = S.Struct({
  accordions: S.Array(Accordion.Model),
})
