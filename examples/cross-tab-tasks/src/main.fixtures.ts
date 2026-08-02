import { AsyncData } from 'foldkit'

import { Item, Model } from './main'

export const buyMilk = Item.make({
  id: 'a',
  text: 'Buy milk',
  completed: false,
  createdAt: 1000,
})

export const walkDog = Item.make({
  id: 'b',
  text: 'Walk the dog',
  completed: false,
  createdAt: 2000,
})

export const doneTask = Item.make({
  id: 'c',
  text: 'Done task',
  completed: true,
  createdAt: 3000,
})

export const readyModel = (items: ReadonlyArray<Item>): Model =>
  Model.make({
    items: AsyncData.Success({ data: items }),
    newItemText: '',
    filter: 'All',
  })

export const loadingModel: Model = Model.make({
  items: AsyncData.Loading(),
  newItemText: '',
  filter: 'All',
})

export const failedModel: Model = Model.make({
  items: AsyncData.Failure({ error: 'IndexedDB is unavailable' }),
  newItemText: '',
  filter: 'All',
})

export const staleModel = (items: ReadonlyArray<Item>, error: string): Model =>
  Model.make({
    items: AsyncData.Stale({ data: items, error }),
    newItemText: '',
    filter: 'All',
  })
