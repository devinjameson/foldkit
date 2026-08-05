import { run } from 'foldkit/runtime'

import { application } from './main'

// An entry module under a different name. It exports nothing, so no test can
// be surprised by an import of it, and the boot is its whole purpose.

run(application)
