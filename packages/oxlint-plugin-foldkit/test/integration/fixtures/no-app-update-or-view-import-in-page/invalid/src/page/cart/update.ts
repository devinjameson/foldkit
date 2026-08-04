// The app update folds this page in, so importing it back closes a cycle.
import { update as appUpdate } from '../../update'

import { Model } from './model'

export const update = (model: Model) => appUpdate(model)
