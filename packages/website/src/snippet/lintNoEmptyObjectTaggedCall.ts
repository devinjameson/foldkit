import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedSave: {},
})

// ❌ Bad
const badMessage = Message.ClickedSave({})

// ✅ Good
const goodMessage = Message.ClickedSave()
