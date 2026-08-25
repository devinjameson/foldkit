---
'create-foldkit-app': patch
---

Give the SSG scaffold's `injectIntoTemplate` call the container id the rest of its prerender script already uses. `scripts/prerender.ts` names the container in one `CONTAINER_ID` constant and tests the built `index.html` for that placeholder, but the injection call fell back to its own `root` default. Renaming the container left the guard looking for the new placeholder while injection still demanded `<div id="root"></div>`, so the first prerender failed with an error naming a container id the project no longer used. The constant now drives both.
