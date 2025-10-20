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
import {
  Class,
  Disabled,
  Html,
  OnClick,
  OnInput,
  OnSubmit,
  Placeholder,
  Type,
  Value,
  button,
  div,
  form,
  input,
  li,
  p,
  span,
  ul,
} from 'foldkit/html'
import { ST, ts } from 'foldkit/schema'

const WS_URL = 'wss://echo.websocket.org'
const CONNECTION_TIMEOUT_MS = 5000

const ChatMessage = S.Struct({
  text: S.String,
  zoned: S.DateTimeZonedFromSelf,
  isSent: S.Boolean,
})

type ChatMessage = ST<typeof ChatMessage>

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

type ConnectionDisconnected = ST<typeof ConnectionDisconnected>
type ConnectionConnecting = ST<typeof ConnectionConnecting>
type ConnectionConnected = ST<typeof ConnectionConnected>
type ConnectionError = ST<typeof ConnectionError>
type ConnectionState = ST<typeof ConnectionState>

const Model = S.Struct({
  connection: ConnectionState,
  messages: S.Array(ChatMessage),
  messageInput: S.String,
})

type Model = ST<typeof Model>

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

type RequestConnect = ST<typeof RequestConnect>
type Connected = ST<typeof Connected>
type Disconnected = ST<typeof Disconnected>
type ConnectionFailed = ST<typeof ConnectionFailed>
type UpdateMessageInput = ST<typeof UpdateMessageInput>
type SendMessage = ST<typeof SendMessage>
type MessageSent = ST<typeof MessageSent>
type MessageReceived = ST<typeof MessageReceived>
type GotReceivedMessageTime = ST<typeof GotReceivedMessageTime>
type GotSentMessageTime = ST<typeof GotSentMessageTime>
type Message = ST<typeof Message>

const update = (model: Model, message: Message): [Model, Runtime.Command<Message>[]] =>
  M.value(message).pipe(
    M.withReturnType<[Model, Runtime.Command<Message>[]]>(),
    M.tagsExhaustive({
      RequestConnect: () => [
        { ...model, connection: ConnectionConnecting.make() },
        [connectCommand()],
      ],

      Connected: ({ socket }) => [
        { ...model, connection: ConnectionConnected.make({ socket }) },
        [],
      ],

      Disconnected: () => [
        {
          ...model,
          connection: ConnectionDisconnected.make(),
          messages: [],
        },
        [],
      ],

      ConnectionFailed: ({ error }) => [
        { ...model, connection: ConnectionError.make({ error }) },
        [],
      ],

      UpdateMessageInput: ({ value }) => [{ ...model, messageInput: value }, []],

      SendMessage: () => {
        const trimmedMessage = model.messageInput.trim()

        if (String.isEmpty(trimmedMessage)) {
          return [model, []]
        }

        return M.value(model.connection).pipe(
          M.withReturnType<[Model, Runtime.Command<Message>[]]>(),
          M.tag('ConnectionConnected', ({ socket }) => [
            { ...model, messageInput: '' },
            [sendMessageCommand(socket, trimmedMessage)],
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
          {
            ...model,
            messages: [...model.messages, newMessage],
          },
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
          {
            ...model,
            messages: [...model.messages, newMessage],
          },
          [],
        ]
      },
    }),
  )

const init: Runtime.ElementInit<Model, Message> = () => [
  {
    connection: ConnectionDisconnected.make(),
    messages: [],
    messageInput: '',
  },
  [],
]

const sendMessageCommand = (socket: WebSocket, text: string): Runtime.Command<MessageSent> =>
  Effect.sync(() => {
    socket.send(text)
    return MessageSent.make({ text })
  })

const connectCommand = (): Runtime.Command<Connected | ConnectionFailed> =>
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

const CommandStreamsDeps = S.Struct({
  websocket: S.OptionFromSelf(S.instanceOf(WebSocket)),
})

const commandStreams = Runtime.makeCommandStreams(CommandStreamsDeps)<Model, Message>({
  websocket: {
    modelToDeps: (model: Model) =>
      M.value(model.connection).pipe(
        M.tag('ConnectionConnected', ({ socket }) => Option.some(socket)),
        M.orElse(() => Option.none()),
      ),
    depsToStream: (websocket: Option.Option<WebSocket>) =>
      Option.match(websocket, {
        onNone: () => Stream.empty,
        onSome: (ws: WebSocket) =>
          Stream.async<Runtime.Command<Message>>((emit) => {
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
          }),
      }),
  },
})

const view = (model: Model): Html =>
  div(
    [
      Class(
        'min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 flex flex-col items-center justify-center p-6',
      ),
    ],
    [
      div(
        [Class('bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col h-[600px]')],
        [
          div(
            [Class('p-6 border-b border-gray-200 flex items-center justify-between')],
            [
              div(
                [],
                [
                  div([Class('text-2xl font-bold text-gray-800')], ['WebSocket Chat']),
                  div([Class('text-sm text-gray-500 mt-1')], ['Echo server demo']),
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
  div(
    [Class('flex items-center gap-2')],
    [
      M.value(connection).pipe(
        M.tagsExhaustive({
          ConnectionDisconnected: () => div([Class('w-3 h-3 rounded-full bg-red-500')], []),
          ConnectionConnecting: () =>
            div([Class('w-3 h-3 rounded-full bg-yellow-500 animate-pulse')], []),
          ConnectionConnected: () => div([Class('w-3 h-3 rounded-full bg-green-500')], []),
          ConnectionError: () => div([Class('w-3 h-3 rounded-full bg-red-500')], []),
        }),
      ),
      M.value(connection).pipe(
        M.tagsExhaustive({
          ConnectionDisconnected: () => span([Class('text-sm text-gray-600')], ['Disconnected']),
          ConnectionConnecting: () => span([Class('text-sm text-gray-600')], ['Connecting...']),
          ConnectionConnected: () => span([Class('text-sm text-gray-600')], ['Connected']),
          ConnectionError: () => span([Class('text-sm text-red-600')], ['Error']),
        }),
      ),
    ],
  )

const messagesView = (messages: readonly ChatMessage[]): Html =>
  Array.match(messages, {
    onEmpty: () =>
      div(
        [Class('flex-1 p-6 overflow-y-auto flex items-center justify-center')],
        [
          div(
            [Class('text-center text-gray-400')],
            [
              p([Class('text-lg mb-2')], ['No messages yet']),
              p([Class('text-sm')], ['Send a message to get started!']),
            ],
          ),
        ],
      ),
    onNonEmpty: (messages) =>
      div(
        [Class('flex-1 p-6 overflow-y-auto')],
        [
          ul(
            [Class('space-y-3')],
            messages.map((message) => {
              return li(
                [Class(message.isSent ? 'flex justify-end' : 'flex justify-start')],
                [
                  div(
                    [
                      Class(
                        message.isSent
                          ? 'bg-blue-500 text-white rounded-lg px-4 py-2 max-w-xs'
                          : 'bg-gray-200 text-gray-800 rounded-lg px-4 py-2 max-w-xs',
                      ),
                    ],
                    [
                      p([Class('break-words')], [message.text]),
                      p(
                        [
                          Class(
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
  div(
    [Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [
      button(
        [
          OnClick(RequestConnect.make()),
          Class(
            'bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition',
          ),
        ],
        ['Connect to Chat'],
      ),
    ],
  )

const connectingView = (): Html =>
  div(
    [Class('p-6 border-t border-gray-200 flex items-center justify-center')],
    [div([Class('text-gray-600 font-semibold')], ['Connecting...'])],
  )

const messageInputView = (messageInput: string): Html =>
  form(
    [Class('p-6 border-t border-gray-200'), OnSubmit(SendMessage.make())],
    [
      div(
        [Class('flex gap-3')],
        [
          input([
            Type('text'),
            Value(messageInput),
            Placeholder('Type a message...'),
            OnInput((value) => UpdateMessageInput.make({ value })),
            Class(
              'flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
            ),
          ]),
          button(
            [
              Type('submit'),
              Disabled(String.isEmpty(messageInput.trim())),
              Class(
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
  div(
    [Class('p-6 border-t border-gray-200')],
    [
      div(
        [Class('bg-red-50 border border-red-200 rounded-lg p-4 mb-4')],
        [
          p([Class('text-red-800 font-semibold mb-1')], ['Connection Error']),
          p([Class('text-red-600 text-sm')], [error]),
        ],
      ),
      button(
        [
          OnClick(RequestConnect.make()),
          Class(
            'w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition',
          ),
        ],
        ['Try Again'],
      ),
    ],
  )

const element = Runtime.makeElement({
  Model,
  init,
  update,
  view,
  commandStreams,
  container: document.getElementById('root')!,
})

Runtime.run(element)
