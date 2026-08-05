import { check } from './check'
import { close } from './close'

// An index file that re-exports nothing is the module file under another
// name, not a half barrel. Gathering icons into one namespace object is the
// reason this shape exists, so the rule leaves it alone.
export const Icon = {
  check,
  close,
}
