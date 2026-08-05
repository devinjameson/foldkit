---
'@foldkit/oxlint-plugin': minor
---

Seven rules that enforce the Project Organization pattern. Each decides from the file's own path plus its syntax, so none needs cross-file state, a type checker, or filesystem access. All are off by default like the rest of the opt-in set.

`foldkit/runtime-boot-only-in-entry` rejects a `Runtime.run` or `Runtime.embed` evaluated at module scope in a module that also exports bindings. The split between `main.ts` and `entry.ts` is what keeps the definitions importable from a test without a runtime, a DOM, and a set of Commands starting as a side effect of the import. Building an application description with `makeApplication` or `makeElement` starts nothing and is never flagged, and neither is a boot inside a function body, which is how the embedding host works.

`foldkit/primitives-declared-in-role-files` requires a Message, a Command, or a Subscription to be declared in the role module named for it, accepting both the `message.ts` and the `message/` folder forms. It fires only on a file that has already claimed a role through its name or its folder, so an app that keeps everything in `main.ts` stays untouched. `Command.define` is allowed in `update.ts` as well, since Commands live beside the update function that returns them.

`foldkit/index-is-a-barrel` rejects code declared in an `index.ts` that also re-exports a value. Types and type-only re-exports are not flagged, and neither is an `index.ts` that re-exports nothing, which is a module file under another name rather than a mixed one.

`foldkit/no-cross-page-imports` rejects a file in one page module importing another page module, and rejects a page importing the page barrel. `foldkit/no-app-update-or-view-import-in-page` rejects a page importing the app level `update` or `view`, which closes a composition cycle. A shared module inside the app view directory, such as `view/icon`, stays available.

`foldkit/no-upward-imports-in-domain` rejects a `domain/` module importing a page or an app level role module. `foldkit/no-tea-primitives-in-domain` rejects a Message, a Command, a Subscription, or view markup declared inside `domain/`. Both hold the domain to being the bottom layer, which is what lets several pages share it and lets it take an ordinary test with no runtime around it.

Two shapes are deliberately left alone throughout. A file sitting directly in the page container is never a subject and never a target, because a path cannot tell a single file page apart from a helper that lives beside the pages. A page importing the app level `model`, `message`, or `command` is not flagged either, since a view only page legitimately uses the app's Message union.
