import { Effect } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedFetchUser = m('CompletedFetchUser')

export const SaveUser = Command.define('FetchUser', {
  messages: [CompletedFetchUser],
  execute: Effect.succeed(CompletedFetchUser()),
})
