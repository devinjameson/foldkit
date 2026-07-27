---
'foldkit': minor
---

Add `lang` and `dir` to the view's `Document`, so an app that switches language at runtime can drive the `<html>` attributes from its Model. `Document` already carried `title`, `canonical`, and `ogUrl`, but the root element was the one piece of document state a view could not reach, because `<html>` sits outside the application container. Getting at it meant a Mount or a Command poking `document.documentElement`, the imperative escape hatch that `title` exists to avoid.

`dir` is typed by a new `TextDirection` Schema exported from `foldkit/html`, covering `'Ltr' | 'Rtl' | 'Auto'`, which the runtime writes as the lowercase attribute values. It is a Schema rather than a bare type union so a Model that stores the direction can use it directly in an `S.Struct`, the same way `Canvas.LineCap` and `Canvas.TextAlign` already work.

Both fields are optional and have no default: when a view omits one, the runtime does not touch that attribute, leaving whatever value it currently holds, so a view that never sets it leaves the served HTML in place and existing apps are unaffected. `makeElement` writes neither, matching how it already leaves the `<head>` alone. Note that the runtime can only sync after the first render, so the served HTML still decides what a crawler sees on first paint.
