import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedSave: {},
})


const goodMessage = Message.ClickedSave()
