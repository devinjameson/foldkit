---
'foldkit': minor
---

Add composable `OnClick` controls for preventing the browser default, stopping DOM propagation, and synchronously focusing an existing element before dispatch. The existing one-argument call keeps its allow-and-bubble behavior, while `OnClickFocus` remains source compatible and is deprecated in favor of the new focus control. Scene now follows the full click propagation path, honors the default-action and propagation controls, and runs submit-button default actions.
