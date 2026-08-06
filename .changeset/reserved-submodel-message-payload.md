---
'@foldkit/oxlint-plugin': patch
---

Reject Got-prefixed Messages that assign an obviously primitive Schema to the reserved `message` payload field. The `message` field identifies a Submodel wrapper, so domain data should use a descriptive field such as `text` instead. Indirect child Message Schemas remain supported.

The `got-submodel-message-name` diagnostic now explains the same reservation when a non-wrapper Message declares a `message` field.
