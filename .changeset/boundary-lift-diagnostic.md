---
'foldkit': patch
---

Explain why a Message could not cross a Submodel boundary.

A wrapper Message is normally a Schema constructor, so handing it a Message outside the child's union throws a Schema error naming the two shapes and nothing else. That error fires inside a DOM listener, the app keeps rendering, and reading it requires already knowing that a boundary sits between the handler and `update`, which makes a real bug look like noise.

The boundary now catches that rejection and reframes it, naming the boundary, the Message, and the cause that accounts for almost every occurrence: a shared view helper building an app-level Message inside a Submodel's view, where a handler's dispatcher is chosen by the frame it is built in rather than by the Message it carries. The original rejection is preserved as `cause`.
