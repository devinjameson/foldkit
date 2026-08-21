import { defineMessageUnion } from 'foldkit/message'

import * as Child from './child'

const Message = defineMessageUnion({
  OpenedChild: {},
  GotChildMessage: { message: Child.Message, },
})
