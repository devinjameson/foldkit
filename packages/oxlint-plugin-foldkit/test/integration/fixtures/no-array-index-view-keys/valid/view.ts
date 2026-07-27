import { staticHtml as h } from 'foldkit/html'

import type { Task } from './model'

export const taskList = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map(task => h.keyed('li')(task.id, [], [task.title])),
  )
