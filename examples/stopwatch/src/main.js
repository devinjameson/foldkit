'use strict'
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i]
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p]
        }
        return t
      }
    return __assign.apply(this, arguments)
  }
Object.defineProperty(exports, '__esModule', { value: true })
var effect_1 = require('effect')
var core_1 = require('@foldkit/core')
var TICK_INTERVAL_MS = 1
var init = {
  elapsedMs: 0,
  isRunning: false,
}
var Message = effect_1.Data.taggedEnum()
var update = (0, core_1.fold)({
  Start: (0, core_1.pure)(function (model) {
    return __assign(__assign({}, model), { isRunning: true })
  }),
  Stop: (0, core_1.pure)(function (model) {
    return __assign(__assign({}, model), { isRunning: false })
  }),
  Reset: (0, core_1.pure)(function () {
    return { elapsedMs: 0, isRunning: false }
  }),
  IncrementElapsedMs: (0, core_1.pure)(function (model) {
    return __assign(__assign({}, model), { elapsedMs: model.elapsedMs + TICK_INTERVAL_MS })
  }),
})
var commandStreams = {
  tick: {
    deps: function (model) {
      return model.isRunning
    },
    stream: function (isRunning) {
      return effect_1.Stream.when(
        effect_1.Stream.tick(effect_1.Duration.millis(TICK_INTERVAL_MS)).pipe(
          effect_1.Stream.map(function () {
            return (0, core_1.makeCommand)(effect_1.Effect.succeed(Message.IncrementElapsedMs()))
          }),
        ),
        function () {
          return isRunning
        },
      )
    },
  },
}
// VIEW
var formatTime = function (milliseconds) {
  var totalMs = Math.max(0, milliseconds)
  var minutes = Math.floor(totalMs / 60000)
  var seconds = Math.floor((totalMs % 60000) / 1000)
  var ms = Math.floor((totalMs % 1000) / 10)
  return ''
    .concat(minutes.toString().padStart(2, '0'), ':')
    .concat(seconds.toString().padStart(2, '0'), '.')
    .concat(ms.toString().padStart(2, '0'))
}
var view = function (model) {
  return (0, core_1.div)(
    [(0, core_1.Class)(pageStyle)],
    [
      (0, core_1.div)(
        [(0, core_1.Class)(containerStyle)],
        [
          (0, core_1.div)([(0, core_1.Class)(timeStyle)], [formatTime(model.elapsedMs)]),
          (0, core_1.div)(
            [(0, core_1.Class)(buttonRowStyle)],
            [
              startStopButton(model.isRunning),
              (0, core_1.button)(
                [(0, core_1.OnClick)(Message.Reset()), (0, core_1.Class)(resetButtonStyle)],
                ['Reset'],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
var startStopButton = function (isRunning) {
  return isRunning
    ? (0, core_1.button)(
        [(0, core_1.OnClick)(Message.Stop()), (0, core_1.Class)(stopButtonStyle)],
        ['Stop'],
      )
    : (0, core_1.button)(
        [(0, core_1.OnClick)(Message.Start()), (0, core_1.Class)(startButtonStyle)],
        ['Start'],
      )
}
// STYLE
var pageStyle = 'min-h-screen bg-gray-100 flex items-center justify-center'
var containerStyle = 'bg-white rounded-lg shadow-lg p-8 text-center'
var timeStyle = 'text-6xl font-mono font-bold text-gray-800 mb-8'
var buttonRowStyle = 'flex gap-4 justify-center'
var buttonStyle = 'px-6 py-3 rounded-lg font-semibold transition-colors'
var startButtonStyle = buttonStyle + ' bg-green-500 hover:bg-green-600 text-white'
var stopButtonStyle = buttonStyle + ' bg-red-500 hover:bg-red-600 text-white'
var resetButtonStyle = buttonStyle + ' bg-gray-500 hover:bg-gray-600 text-white'
// RUN
var app = (0, core_1.makeApp)({
  init: init,
  update: update,
  view: view,
  commandStreams: commandStreams,
  container: document.body,
})
effect_1.Effect.runFork(app)
