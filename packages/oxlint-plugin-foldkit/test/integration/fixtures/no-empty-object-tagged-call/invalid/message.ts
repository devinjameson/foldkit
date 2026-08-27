import { defineTaggedUnion } from 'foldkit/schema'

const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
})

const badSubmission = Submission.NotSubmitted({})
