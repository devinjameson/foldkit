import { Option } from 'effect'
import { to, when } from 'foldkit/experimental/machine'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

const MachineState = defineTaggedUnion({ Idle: {}, Running: {} })
type MachineState = typeof MachineState.Type
type IdleState = typeof MachineState.Idle.Type

const MachineMessage = defineMessageUnion({ Started: {} })
type MachineMessage = typeof MachineMessage.Type

export const startEdge = to<
  MachineState,
  MachineMessage,
  IdleState,
  MachineMessage,
  'Running'
>('Running', () => ({ model: MachineState.Running() }))

export const guardedStartEdge = when<
  MachineState,
  MachineMessage,
  IdleState,
  MachineMessage,
  Option.Option<number>,
  'Running'
>(
  state => Option.some(state._tag.length),
  'Running',
  () => ({ model: MachineState.Running() }),
)
