---
'@foldkit/ui': minor
---

Widen the Tabs `orientation` view input to accept `'Responsive'` alongside `'Horizontal'` and `'Vertical'`, typed by the new `Tabs.TabListOrientation` schema. Under `Responsive` both arrow axes navigate, so ArrowRight and ArrowDown move to the next tab while ArrowLeft and ArrowUp move to the previous, and the tab list emits no `aria-orientation` attribute. Home, End, PageUp, PageDown, Enter, and Space are unchanged, as are the two fixed orientations.

A tab list that lays itself out with responsive classes is a row on a phone and a column on a desktop, so no single orientation is true at every width. Picking one from a media query means the Model has to carry a viewport flag that the server cannot know at prerender time, which hands the phone visitor a wrong answer until hydration corrects it. CSS can flip the layout on its own, but it cannot set `aria-orientation` or decide which arrow keys navigate, so `Responsive` covers both: it navigates on either axis and ships no `aria-orientation` rather than a value that is wrong at half the widths.

Two consequences are worth knowing before you reach for it. A tablist without `aria-orientation` is read as the implicit `horizontal`, so omitting the attribute is not the same as leaving the orientation unspecified. And because both axes navigate, ArrowUp and ArrowDown stop scrolling the page whenever a tab holds focus, including at the widths where the tab list renders as a row.
