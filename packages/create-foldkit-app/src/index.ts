#!/usr/bin/env node
import { Command, HelpDoc, Options } from '@effect/cli'
import { FetchHttpClient } from '@effect/platform'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Effect, Match, Option, Schema, String, flow } from 'effect'

import { create as create_ } from './commands/create.js'

const nameSchema = Schema.String.pipe(
  Schema.filter((name) =>
    Match.value(name).pipe(
      Match.whenOr(
        String.includes('/'),
        String.includes('\\'),
        () => 'Project name cannot contain path separators (/ or \\)',
      ),
      Match.when(String.includes(' '), () => 'Project name cannot contain spaces'),
      Match.when(
        flow(String.match(/[<>:"|?*]/), Option.isSome),
        () => 'Project name cannot contain special characters: < > : " | ? *',
      ),
      Match.whenOr(
        String.startsWith('.'),
        String.startsWith('-'),
        () => 'Project name cannot start with . or -',
      ),
      Match.when(String.isEmpty, () => 'Project name cannot be empty'),
      Match.orElse(() => true),
    ),
  ),
)

const name = Options.text('name').pipe(
  Options.withAlias('n'),
  Options.withDescription('The name of the project to create'),
  Options.withSchema(nameSchema),
)

const example = Options.choice('example', [
  'counter',
  'stopwatch',
  'weather',
  'todo',
  'form',
  'snake',
  'routing',
  'shopping-cart',
]).pipe(
  Options.withAlias('e'),
  Options.withDescription(
    "The example application to start from. Pick an example that's similar to the application you're building. Or create multiple projects and take pieces of each!\n\n" +
      'Available examples:\n' +
      '  counter - Simple increment/decrement with reset\n' +
      '  stopwatch - Timer with start/stop/reset functionality\n' +
      '  weather - HTTP requests with async state handling\n' +
      '  todo - CRUD operations with localStorage persistence\n' +
      '  form - Form validation with async email checking\n' +
      '  snake - Classic game built with command streams\n' +
      '  routing - URL routing with parser combinators and route parameters\n' +
      '  shopping-cart - Complex state management with nested models and routing',
  ),
)

const packageManager = Options.choice('package-manager', ['pnpm', 'npm', 'yarn']).pipe(
  Options.withAlias('p'),
  Options.withDescription('The package manager to use for installing dependencies'),
)

const create = Command.make(
  'create',
  {
    name,
    example,
    packageManager,
  },
  create_,
)

const cli = Command.run(create, {
  name: 'Create Foldkit App',
  version: '0.1.5',
  summary: HelpDoc.getSpan(HelpDoc.p('Create a new Foldkit application')),
})

cli(process.argv).pipe(
  Effect.provide([FetchHttpClient.layer, NodeContext.layer]),
  NodeRuntime.runMain,
)
