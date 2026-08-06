import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as Child from './child'

// ❌ Bad
const ChildChanged = m('ChildChanged', {
  message: Child.Message,
})

// ✅ Good
const GotChildMessage = m('GotChildMessage', {
  message: Child.Message,
})

{
  // ❌ Bad: message is reserved for Submodel wrappers.
  const ShowedNotice = m('ShowedNotice', {
    message: S.String,
  })
}

{
  // ✅ Good: name domain data for what it contains.
  const ShowedNotice = m('ShowedNotice', {
    text: S.String,
  })
}
