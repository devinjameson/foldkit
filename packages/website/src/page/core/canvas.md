# Canvas

## Overview

The `Canvas` module is a declarative 2D rendering surface. `Canvas.view` produces a `<canvas>` VNode whose pixels are a pure function of a `shapes` prop: same shapes, same pixels. Because the view function is pure and the runtime re-paints on every patch, DevTools time-travel reproduces past frames exactly.

Reach for it for pixel art, board games, card games, 2D puzzlers, generative art, charts, and dataviz. The [canvas-art example](/example-apps/canvas-art) demonstrates the API end-to-end with a click-to-spawn bouncing-balls scene.

## Shapes

A scene is a `ReadonlyArray<Shape>`. Each `Shape` is a tagged variant: `Rect`, `Circle`, `Path`, `Text`, or `Group`. `Group` wraps children in a 2D transform (`translate`, `rotate`, `scale`, `opacity`) and composes recursively. `Path` is built from a sequence of `PathInstruction` values: `MoveTo`, `LineTo`, `QuadTo`, `BezierTo`, `Close`.

## Animation and input

For continuous animation, pair `Canvas.view` with [Subscription.animationFrame](/core/subscriptions#animation-frames): a helper that emits a Message every `requestAnimationFrame` tick with the inter-frame delta in milliseconds. update advances the Model in response, and `Canvas.view` re-renders whenever the Model changes (Foldkit batches renders to one per frame).

Pointer handlers are config args on `Canvas.view`: `onPointerDown`, `onPointerMove`, `onPointerUp`. Each receives a `Point` already translated into the canvas’s internal coordinate space (the `width` and `height` you passed), regardless of how the canvas is sized in CSS.

::Snippet{name="canvasBasic" label="Canvas example"}

## Full API surface

The [Canvas API reference](/api-reference/canvas) lists every shape constructor, the `PathInstruction` variants, and `Canvas.view` with full signatures.
