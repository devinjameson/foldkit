import { defineMessageUnion } from 'foldkit/message'

const Message = defineMessageUnion({
  ClickedSave: {},
})


const badMessage = Message.ClickedSave({})
