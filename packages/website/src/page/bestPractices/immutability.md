# Immutability

## Immutable Updates with evo {#immutable-updates}

Foldkit provides `evo` for immutable Model updates. It wraps Effect’s `Struct.evolve` with stricter type checking. If you remove or rename a key from your Model, you’ll get type errors everywhere you try to update it.

::Snippet{name="evoExample" label="evo example"}

Each property in the transform object is a function that takes the current value and returns the new value. Properties not included remain unchanged.
