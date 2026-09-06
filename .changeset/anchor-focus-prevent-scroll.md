---
'@foldkit/ui': patch
---

Keep an anchored panel in place when its button sits in a fixed header. Two things went wrong for a panel opened from a `position: fixed` header, for example a Menu, Listbox, or Popover, both visible in the website's theme picker on phones and tablets.

Opening the panel scrolled the page. The reveal focused the freshly positioned panel with a plain `.focus()`, and on a page whose `scroll-padding-top` is larger than the panel's offset from the top of the viewport, the browser scrolled the document to push the panel below that padding. The reveal now focuses with `preventScroll: true`, since Floating UI has already placed the panel in view.

Scrolling with the panel open made it jump. The panel was positioned with Floating UI's absolute strategy in document coordinates, so every scroll moved it with the page until the scroll listener put it back under the button. A portaled panel whose button has a `position: fixed` ancestor is now positioned with the fixed strategy and stays under the button as the page scrolls.
