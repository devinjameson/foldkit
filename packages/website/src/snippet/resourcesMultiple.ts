import { Layer } from 'effect'
import { Runtime } from 'foldkit'

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  resources: Layer.mergeAll(
    AudioContextService.Default,
    WebRTCService.Default,
    CanvasService.Default,
  ),
})
