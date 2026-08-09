---
'foldkit': patch
---

Rename the `Update.foldChild` TSDoc example's step from `joinRoom` to `enterJoinedRoom` and the child helper it calls from `Room.join` to `Room.informJoined`. The step runs after the join has already succeeded, so the old names read as initiating a join the example is actually reporting.
