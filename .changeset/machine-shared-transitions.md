---
'foldkit': minor
---

Add `Machine.forStates(...).on(...)` and the Machine definition's `shared` array for declaring one transition map across several source states.

Shared handlers narrow `state` to the selected state variants and `message` to each transition's Message. State-local transitions replace shared defaults for the same state and Message, while overlapping shared declarations throw when the Machine is defined. Shared transitions are expanded into the Machine's ordinary Edge set before runtime dispatch and static analysis.
