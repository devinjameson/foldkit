# File

## Overview

The `File` module wraps the browser file APIs as Effects you can run from a Command. It mirrors the design of Elm’s `elm/file` package: file values are opaque, file selection happens imperatively through a Command (not a form event), and file contents are read asynchronously via `FileReader`.

A `File` is a direct alias for the browser’s native `File` type. You can hold one in your Model with `S.Option(File.File)`. Foldkit never serializes files, so the schema acts as an opaque guard rather than a parser.

## Metadata and reading

`File.name`, `File.size`, and `File.mimeType` return metadata synchronously. `File.readAsText`, `File.readAsDataUrl`, and `File.readAsArrayBuffer` wrap the browser’s `FileReader` as Effects that can fail with a `FileReadError`. Use `readAsDataUrl` when you want a preview thumbnail without uploading the file first.

::Snippet{name="fileMetadataAndRead" label="file metadata and read example"}

## Selecting files

`File.select` and `File.selectMultiple` open the native file picker and resolve with what the user chose. Both take a list of accepted MIME types or extensions. `File.select` resolves with `Option.some(file)` on a pick or `Option.none()` on cancel; `File.selectMultiple` resolves with the array of chosen files, empty if the user cancels. Mirrors Elm’s `File.Select.file` and `File.Select.files`.

Wrap the Effect in a Command at the call site with `Effect.map` to produce your own Message. The `File` module never defines Messages, so you keep full control of your domain vocabulary.

::Snippet{name="fileSelect" label="file select example"}

## Components

For drop zones and inline file pickers, reach for `FileDrop`. It is a Submodel that wires a drop zone and a hidden `<input type="file">` together and emits a `ReceivedFiles` OutMessage when files arrive (whether dropped or picked through the input). It handles the easy-to-miss details for you: it resets the input so the same file can be picked again, calls `preventDefault` on drop, and tracks drag state that flips only on true entry and exit. When you need a shape it does not cover, build directly with the `OnFileChange` and `OnDropFiles` attributes in `foldkit/html`.

::Snippet{name="uiFileDropBasic" label="FileDrop example"}

## Testing

Scene tests exercise file flows through two helpers. `dropFiles` dispatches a synthetic drop event on a drop zone (e.g. the root of a `FileDrop`), and `changeFiles` dispatches a synthetic change event on a file input. Both accept a target locator and a `ReadonlyArray<File>`, and throw a clear error if the target element does not have the matching file-event handler registered.

For button-triggered pickers that use the `File.select` Command, scene tests use `click` on the button and then `Command.resolve` to synthesize the result, bypassing the native file picker entirely. Use `Command.resolveAll` when an update returns multiple Commands at once, or when resolving one Command cascades into others, like reading a preview immediately after a successful selection.

::Snippet{name="fileSceneTest" label="file scene test example"}
