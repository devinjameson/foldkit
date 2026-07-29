const LoadAllNotes = Command.define('LoadAllNotes', {
  messages: [SucceededLoadAllNotes, FailedLoadAllNotes],
  execute: pipe(
    fetchAllNotes,
    Effect.match({
      onSuccess: notes => SucceededLoadAllNotes({ notes }),
      onFailure: error => FailedLoadAllNotes({ error }),
    }),
  ),
})

M.tagsExhaustive({
  SucceededLoadAllNotes: ({ notes }) => [
    evo(model, { allNotes: () => AsyncData.Success({ data: notes }) }),
    [],
  ],
  FailedLoadAllNotes: ({ error }) => [
    evo(model, { allNotes: () => AsyncData.Failure({ error }) }),
    [],
  ],
})
