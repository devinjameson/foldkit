---
'create-foldkit-app': patch
---

Split the scaffolded agent instructions into two files. `FOLDKIT.md` carries Foldkit's conventions and is replaced whole when a project upgrades its Foldkit packages. `AGENTS.md` is a short stub that points at it and holds whatever the project wants to tell its own agents.

Before this, both lived in one file, so refreshing the conventions meant merging Foldkit's paragraphs into a file the project had also edited, with nothing to mark which paragraphs were whose. Refreshing is now a file copy. The `subtree_prompted` marker moves to `AGENTS.md`, since it is per-project state that an upgrade must not reset.
