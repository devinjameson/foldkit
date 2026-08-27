---
'foldkit': minor
---

Add `OnFocusEnter` and `OnFocusLeave` attributes for modeling focus across a compound region. Put them on a common ancestor and Foldkit dispatches only when focus crosses that ancestor's boundary, not when it moves between descendants. The new `Scene.focusEnter` and `Scene.focusLeave` interactions exercise the same Messages in scene tests.
