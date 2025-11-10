import {
  Array,
  DateTime,
  Duration,
  Effect,
  Match as M,
  Option,
  Schema as S,
  Stream,
  String,
} from 'effect'
import { Runtime, Task } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { ts } from 'foldkit/schema'
import { evo } from 'foldkit/struct'

const WS_URL = 'wss://echo.websocket.org'
const CONNECTION_TIMEOUT_MS = 5000

// MODEL

const ChatMessage = S.Struct({
  text: S.String,
  zoned: S.DateTimeZonedFromSelf,
  isSent: S.Boolean,
})

type ChatMessage = typeof ChatMessage.Type

const WebSocketSchema = S.instanceOf(WebSocket)

const ConnectionDisconnected = ts('ConnectionDisconnected')
const ConnectionConnecting = ts('ConnectionConnecting')
const ConnectionConnected = ts('ConnectionConnected', { socket: WebSocketSchema })
const ConnectionError = ts('ConnectionError', { error: S.String })

const ConnectionState = S.Union(
  ConnectionDisconnected,
  ConnectionConnecting,
  ConnectionConnected,
  ConnectionError,
)

type ConnectionDisconnected = typeof ConnectionDisconnected.Type
type ConnectionConnecting = typeof ConnectionConnecting.Type
type ConnectionConnected = typeof ConnectionConnected.Type
type ConnectionError = typeof ConnectionError.Type
type ConnectionState = typeof ConnectionState.Type

const Model = S.Struct({
  connection: ConnectionState,
  messages: S.Array(ChatMessage),
  messageInput: S.String,
})

type Model = typeof Model.Type

// MESSAGE

const RequestConnect = ts('RequestConnect')
const Connected = ts('Connected', { socket: WebSocketSchema })
const Disconnected = ts('Disconnected')
const ConnectionFailed = ts('ConnectionFailed', { error: S.String })
const UpdateMessageInput = ts('UpdateMessageInput', { value: S.String })
const SendMessage = ts('SendMessage')
const MessageSent = ts('MessageSent', { text: S.String })
const MessageReceived = ts('MessageReceived', { text: S.String })
const GotReceivedMessageTime = ts('GotReceivedMessageTime', {
  text: S.String,
  zoned: S.DateTimeZonedFromSelf,
})
const GotSentMessageTime = ts('GotSentMessageTime', {
  text: S.String,
  zoned: S.DateTimeZonedFromSelf,
})

const Message = S.Union(
  RequestConnect,
  Connected,
  Disconnected,
  ConnectionFailed,
  UpdateMessageInput,
  SendMessage,
  MessageSent,
  MessageReceived,
  GotReceivedMessageTime,
  GotSentMessageTime,
)

type RequestConnect = typeof RequestConnect.Type
type Connected = typeof Connected.Type
type Disconnected = typeof Disconnected.Type
type ConnectionFailed = typeof ConnectionFailed.Type
type UpdateMessageInput = typeof UpdateMessageInput.Type
type SendMessage = typeof SendMessage.Type
type MessageSent = typeof MessageSent.Type
type MessageReceived = typeof MessageReceived.Type
type GotReceivedMessageTime = typeof GotReceivedMessageTime.Type
type GotSentMessageTime = typeof GotSentMessageTime.Type
type Message = typeof Message.Type

// UPDATE

const update = (model: Model, message: Message): [Model, ReadonlyArray<Runtime.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
    M.tagsExhaustive({
      RequestConnect: () => [
        evo(model, {
          connection: () => ConnectionConnecting.make(),
        }),
        [connect()],
      ],

      Connected: ({ socket }) => [
        evo(model, {
          connection: () => ConnectionConnected.make({ socket }),
        }),
        [],
      ],

      Disconnected: () => [
        evo(model, {
          connection: () => ConnectionDisconnected.make(),
          messages: () => [],
        }),
        [],
      ],

      ConnectionFailed: ({ error }) => [
        evo(model, {
          connection: () => ConnectionError.make({ error }),
        }),
        [],
      ],

      UpdateMessageInput: ({ value }) => [
        evo(model, {
          messageInput: () => value,
        }),
        [],
      ],

      SendMessage: () => {
        const trimmedMessage = model.messageInput.trim()

        if (String.isEmpty(trimmedMessage)) {
          return [model, []]
        }

        return M.value(model.connection).pipe(
          M.withReturnType<[Model, ReadonlyArray<Runtime.Command<Message>>]>(),
          M.tag('ConnectionConnected', ({ socket }) => [
            evo(model, {
              messageInput: () => '',
            }),
            [sendMessage(socket, trimmedMessage)],
          ]),
          M.orElse(() => [model, []]),
        )
      },

      MessageSent: ({ text }) => [
        model,
        [Task.getZonedTime((zoned) => GotSentMessageTime.make({ text, zoned }))],
      ],

      GotSentMessageTime: ({ text, zoned }) => {
        const newMessage = ChatMessage.make({
          text,
          zoned,
          isSent: true,
        })

        return [
          evo(model, {
            messages: (messages) => [...messages, newMessage],
          }),
          [],
        ]
      },

      MessageReceived: ({ text }) => [
        model,
        [Task.getZonedTime((zoned) => GotReceivedMessageTime.make({ text, zoned }))],
      ],

      GotReceivedMessageTime: ({ text, zoned }) => {
        const newMessage = ChatMessage.make({
          text,
          zoned,
          isSent: false,
        })

        return [
          evo(model, {
            messages: (messages) => [...messages, newMessage],
          }),
          [],
        ]
      },
    }),
  )

// INIT

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    connection: ConnectionDisconnected.make(),
    messages: [],
    messageInput: '',
  },
  [],
]

// COMMAND

const sendMessage = (socket: WebSocket, text: string): Runtime.Command<MessageSent> =>
  Effect.sync(() => {
    socket.send(text)
    return MessageSent.make({ text })
  })

const connect = (): Runtime.Command<Connected | ConnectionFailed> =>
  Effect.race(
    Effect.async<Connected | ConnectionFailed>((resume) => {
      const ws = new WebSocket(WS_URL)

      const handleOpen = () => {
        resume(Effect.succeed(Connected.make({ socket: ws })))
      }

      const handleError = () => {
        resume(Effect.succeed(ConnectionFailed.make({ error: 'Failed to connect to WebSocket' })))
      }

      ws.addEventListener('open', handleOpen)
      ws.addEventListener('error', handleError)

      return Effect.sync(() => {
        ws.removeEventListener('open', handleOpen)
        ws.removeEventListener('error', handleError)
      })
    }),
    Effect.sleep(Duration.millis(CONNECTION_TIMEOUT_MS)).pipe(
      Effect.as(ConnectionFailed.make({ error: 'Connection timeout' })),
    ),
  )

// COMMAND STREAM

const CommandStreamsDeps = S.Struct({
  maybeWebsocket: S.OptionFromSelf(WebSocketSchema),
})

const commandStreams = Runtime.makeCommandStreams(CommandStreamsDeps)<Model, Message>({
  maybeWebsocket: {
    modelToDeps: (model: Model) =>
      M.value(model.connection).pipe(
        M.tag('ConnectionConnected', ({ socket }) => Option.some(socket)),
        M.orElse(() => Option.none()),
      ),
    depsToStream: (maybeWebsocket: Option.Option<WebSocket>) =>
      Option.match(maybeWebsocket, {
        onNone: () => Stream.empty,
        onSome: (ws: WebSocket) =>
          Stream.async<Runtime.Command<MessageReceived | Disconnected | ConnectionFailed>>(
            (emit) => {
              const handleMessage = (event: MessageEvent) => {
                emit.single(Effect.succeed(MessageReceived.make({ text: event.data })))
              }

              const handleClose = () => {
                emit.single(Effect.succeed(Disconnected.make()))
                emit.end()
              }

              const handleError = () => {
                emit.single(Effect.succeed(ConnectionFailed.make({ error: 'Connection error' })))
                emit.end()
              }

              ws.addEventListener('message', handleMessage)
              ws.addEventListener('close', handleClose)
              ws.addEventListener('error', handleError)

              return Effect.sync(() => {
                ws.removeEventListener('message', handleMessage)
                ws.removeEventListener('close', handleClose)
                ws.removeEventListener('error', handleError)
              })
            },
          ),
      }),
  },
})

// VIEW

const h = html<Message>()

const view = (model: Model): Html =>
  h.div(
    [
      h.Class(
        'min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex flex-col items-center justify-center p-6',
      ),
    ],
    [
      h.div(
        [h.Class('bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[600px]')],
        [
          h.div(
            [h.Class('p-6 border-b border-gray-200 flex items-center justify-between')],
            [
              h.div(
                [],
                [
                  h.div([h.Class('text-2xl font-bold text-gray-800')], ['WebSocket Chat']),
                  h.div([h.Class('text-sm text-gray-500 mt-1')], ['Echo server demo']),
                ],
              ),
              connectionStatusView(model.connection),
            ],
          ),

          messagesView(model.messages),

          M.value(model.connection).pipe(
            M.tagsExhaustive({
              ConnectionDisconnected: connectButtonView,
              ConnectionConnecting: connectingView,
              ConnectionConnected: () => messageInputView(model.messageInput),
              ConnectionError: ({ error }) => errorView(error),
            }),
          ),
        ],
      ),
    ],
  )

const connectionStatusView = (connection: ConnectionState): Html =>
  h.div(
    [h.Class('flex items-center gap-2')],
    [
      M.value(connection).pipe(
        M.tagsExhaustive({
          ConnectionDisconnected: () => h.div([h.Class('w-3 h-3 rounded-full bg-red-500')], []),
          ConnectionConnecting: () =>
            h.div([h.Class('w-3 h-3 rounded-full bg-yellow-500 animate-pulse')], []),
          ConnectionConnected: () => h.div([h.Class('w-3 h-3 rounded-full bg-green-500')], []),
          ConnectionError: () => h.div([h.Class('w-3 h-3 rounded-full bg-red-500')], []),
        }),
      ),
      M.value(connection).pipe(
        M.tagsExhaustive({
          ConnectionDisconnected: () => h.span([h.Class('text-sm text-gray-600')], ['Disconnected']),
          ConnectionConnecting: () => h.span([h.Class('text-sm text-gray-600')], ['Connecting...']),
          ConnectionConnected: () => h.span([h.Class('text-sm text-gray-600')], ['Connected']),
          ConnectionError: () => h.span([h.Class('text-sm text-red-600')], ['Error']),
        }),
      ),
    ],
  )

const messagesView = (messages: ReadonlyArray<ChatMessage>): Html =>
  Array.match(messages, {
    onEmpty: () =>
      h.div(
        [h.Class('flex-1 p-6 overflow-y-auto flex items-center justify-center')],
        [
          h.div(
            [h.Class('text-center text-gray-400')],
            [
              h.p([h.Class('text-lg mb-2')], ['No messages yet']),
              h.p([h.Class('text-sm')], ['Send a message to get started!']),
            ],
          ),
        ],
      ),
    onNonEmpty: (messages) =>
      h.div(
        [h.Class('flex-1 p-6 overflow-y-auto')],
        [
          h.ul(
            [h.Class('space-y-3')],
            messages.map((message) => {
              return h.li(
                [h.Class(message.isSent ? 'flex justify-end' : 'flex justify-start')],
                [
                  h.div(
                    [
                      h.Class(
                        message.isSent
                          ? 'bg-blue-500 text-white rounded-lg px-4 py-2 max-w-xs'
                          : 'bg-gray-200 text-gray-800 rounded-lg px-4 py-2 max-w-xs',
                      ),
                    ],
                    [
                      h.p([h.Class('break-words')], [message.text]),
                      h.p(
                        [
                          h.Class(
                            message.isSent
                              ? 'text-blue-100 text-xs mt-1'
                              : 'text-gray-500 text-xs mt-1',
                          ),
                        ],
                        [
                          DateTime.format(message.zoned, {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          }),
                        ],
                      ),
                    ],
                  ),
                ],
              )
            }),
          ),
        ],
      ),
  })

const connectButtonView = (): Html =>
  h.div(
    [h.Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [
      h.button(
        [
          h.OnClick(RequestConnect.make()),
          h.Class(
            'bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition',
          ),
        ],
        ['Connect to Chat'],
      ),
    ],
  )

const connectingView = (): Html =>
  h.div(
    [h.Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [h.div([h.Class('text-gray-600 font-semibold')], ['Connecting...'])],
  )

const messageInputView = (messageInput: string): Html =>
  h.form(
    [h.Class('p-6 border-t border-gray-200'), h.OnSubmit(SendMessage.make())],
    [
      h.div(
        [h.Class('flex gap-3')],
        [
          h.input([
            h.Type('text'),
            h.Value(messageInput),
            h.Placeholder('Type a message...'),
            h.OnInput((value) => UpdateMessageInput.make({ value })),
            h.Class(
              'flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
            ),
          ]),
          h.button(
            [
              h.Type('submit'),
              h.Disabled(String.isEmpty(messageInput.trim())),
              h.Class(
                'bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition',
              ),
            ],
            ['Send'],
          ),
        ],
      ),
    ],
  )

const errorView = (error: string): Html =>
  h.div(
    [h.Class('p-6 border-t border-gray-200')],
    [
      h.div(
        [h.Class('bg-red-50 border border-red-200 rounded-lg p-4 mb-4')],
        [
          h.p([h.Class('text-red-800 font-semibold mb-1')], ['Connection Error']),
          h.p([h.Class('text-red-600 text-sm')], [error]),
        ],
      ),
      h.button(
        [
          h.OnClick(RequestConnect.make()),
          h.Class(
            'w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition',
          ),
        ],
        ['Try Again'],
      ),
    ],
  )

// RUN

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  commandStreams,
  container: document.getElementById('root')!,
})

Runtime.run(element)
