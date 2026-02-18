import { Task } from 'foldkit'

const getTime = Task.getTime((utc) => GotTime({ utc }))

const getZonedTime = Task.getZonedTime((zoned) =>
  GotZonedTime({ zoned }),
)

const getNyTime = Task.getZonedTimeIn('America/New_York', (zoned) =>
  GotNyTime({ zoned }),
)
