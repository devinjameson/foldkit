# A Simple Counter Example

## Overview

Here’s a complete counter application. It wires up the core of the loop from the [Architecture](/core/architecture) page (a Model, Messages, update, init, and view).

A Foldkit app lives in two files. `src/main.ts` holds the pure definitions: Model, Messages, update, init, view, etc. `src/entry.ts` imports them and boots the runtime. The split keeps `main.ts` importable from tests without booting a runtime as a side effect.

::Snippet{name="counter" label="counter main.ts"}

`entry.ts` is the only place runtime side effects happen. `Runtime.makeApplication` bundles the pieces together. `Runtime.run` starts the app.

::Snippet{name="counterEntry" label="counter entry.ts"}

Don’t worry about understanding every line yet. The next four pages break this code apart piece by piece. After that, we’ll add new features to the counter (a delayed reset, auto-counting, loading saved state) and each one will introduce a new concept.

Let’s start with the Model: the single data structure that holds everything your application can be.
