---
'create-foldkit-app': patch
---

Make the SSG scaffold's prerender step repeatable. `scripts/prerender.ts` read its template from `dist/client/index.html` and then wrote the generated `/` over that same file, so a second run against one client build parsed a generated page as its template and stopped with `injectIntoTemplate found no exact <div id="root"></div> placeholder in the template`. That error names the application's `index.html`, which was never the problem, so the reported fault and the actual one were in different files.

The script now takes the built `index.html` as its template only while that file still holds the `<div id="root"></div>` placeholder, and keeps a copy under `node_modules/.cache/foldkit/` that later runs against the same client build read instead. The placeholder is the condition `injectIntoTemplate` enforces, so the test covers a static render (`isHydratable: false`) as well as a hydratable one, where a test for the hydration stamp would have read a generated page as the template and cached it over the good copy. A client build always writes the template back to `index.html`, so the copy can never outlive the assets it names. Running the prerender step twice against one build now generates the same pages both times, and running it with no client build present fails with a message that names the missing build.
