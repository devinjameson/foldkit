import { staticHtml as h } from 'foldkit/html'

import type { Task } from './model'

export const taskList = (tasks: ReadonlyArray<Task>) =>
  h.ul(
    [],
    tasks.map((task, index) => h.keyed('li')(index, [], [task.title])),
  )
