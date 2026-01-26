import { Task } from 'foldkit'

const getTime = Task.getTime((utc) => GotTime.make({ utc }))

const getZonedTime = Task.getZonedTime((zoned) =>
  GotZonedTime.make({ zoned }),
)

const getNyTime = Task.getZonedTimeIn('America/New_York', (zoned) =>
  GotNyTime.make({ zoned }),
)
