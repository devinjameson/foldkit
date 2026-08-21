import { Schema as S } from 'effect'
import { evo } from 'foldkit/struct'

const Model = S.Struct({
  count: S.Number,
  status: S.Literals(['Idle', 'Counting']),
})
type Model = typeof Model.Type

const model: Model = { count: 0, status: 'Idle' }

const nextModel = evo(model, {
  count: count => count + 1,
  status: () => 'Counting',
})
