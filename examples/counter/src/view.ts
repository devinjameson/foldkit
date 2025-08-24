import {
  Html,
  div,
  Class,
  text,
  button,
  OnClick,
  input,
  Id,
  Value,
  OnChange,
  Type,
} from '@foldkit/core'
import {
  Model,
  pageStyle,
  countStyle,
  buttonRowStyle,
  Message,
  buttonStyle,
  secondsToInputValue,
  handleChangeIncrementInterval,
  handleChangeDecrementInterval,
} from './main'

const view = (model: Model): Html =>
  div(
    [Class(pageStyle)],
    [
      div([Class(countStyle)], [text(model.count.toString())]),
      div(
        [Class(buttonRowStyle)],
        [
          button([OnClick(Message.Decrement()), Class(buttonStyle)], ['-']),
          button([OnClick(Message.SetCount({ nextCount: 0 })), Class(buttonStyle)], ['Reset']),
          button([OnClick(Message.IncrementLater()), Class(buttonStyle)], ['+ in 1s']),
          button([OnClick(Message.Increment()), Class(buttonStyle)], ['+']),
        ],
      ),
      div(
        [Class('flex flex-col gap-2')],
        [
          text('Auto-increment every (seconds):'),
          input([
            Id('increment-interval'),
            Value(secondsToInputValue(model.incrementIntervalSeconds)),
            OnChange(handleChangeIncrementInterval),
            Class('border p-2 rounded'),
            Type('number'),
            Min(0),
          ]),
        ],
      ),
      div(
        [Class('flex flex-col gap-2')],
        [
          text('Auto-decrement every (seconds):'),
          input([
            Id('decrement-interval'),
            Value(secondsToInputValue(model.decrementIntervalSeconds)),
            OnChange(handleChangeDecrementInterval),
            Class('border p-2 rounded'),
            Type('number'),
            Min(0),
          ]),
        ],
      ),
    ],
  )
