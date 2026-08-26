import { Effect, Schema as S } from 'effect'

import { defineTaggedUnion } from '../schema/index.js'

// SHARED

/** A serialized Command produced during a Message dispatch (or `init`). `args` is `Some` when the Command's definition declared an args record, and carries the runtime values used to construct the Command instance. */
export const SerializedCommand = S.Struct({
  name: S.String,
  args: S.OptionFromNullOr(S.Record(S.String, S.Unknown)),
})
/** A serialized Command suitable for transmission over the WS protocol. */
export type SerializedCommand = typeof SerializedCommand.Type

/** A serialized Mount lifecycle event (start or end). `args` is `Some` when the Mount's definition declared an args record, and carries the runtime values used to construct the MountAction instance. */
export const SerializedMount = S.Struct({
  name: S.String,
  args: S.OptionFromNullOr(S.Record(S.String, S.Unknown)),
})
/** A serialized Mount lifecycle event suitable for transmission over the WS protocol. */
export type SerializedMount = typeof SerializedMount.Type

/** A serialized history entry as it appears on the wire. `submodelPath` lists `Got<Child>Message` wrapper tags from outer to inner when the entry came up through a Submodel chain; `maybeLeafTag` is `Some` with the innermost child Message tag when one exists. `mountStarts` lists Mounts that fired during the render after this Message; `mountEnds` lists Mounts whose elements were unmounted during that render. The Messages dispatched by mount Effects appear as their own entries elsewhere in history. */
export const SerializedEntry = S.Struct({
  index: S.Number,
  tag: S.String,
  message: S.Unknown,
  commands: S.Array(SerializedCommand),
  mountStarts: S.Array(SerializedMount),
  mountEnds: S.Array(SerializedMount),
  timestamp: S.Number,
  isModelChanged: S.Boolean,
  changedPaths: S.Array(S.String),
  affectedPaths: S.Array(S.String),
  submodelPath: S.Array(S.String),
  maybeLeafTag: S.OptionFromNullOr(S.String),
})
/** A serialized history entry suitable for transmission over the WS protocol. */
export type SerializedEntry = typeof SerializedEntry.Type

/** Metadata about a single keyframe. The index identifies the point in history where the runtime can replay back to. */
export const KeyframeInfo = S.Struct({
  index: S.Number,
})
/** Metadata about a single keyframe. */
export type KeyframeInfo = typeof KeyframeInfo.Type

/** Metadata about a connected browser runtime. */
export const RuntimeInfo = S.Struct({
  connectionId: S.String,
  url: S.String,
  title: S.String,
})
/** Metadata about a connected browser runtime. */
export type RuntimeInfo = typeof RuntimeInfo.Type

// REQUEST

/** The largest batch `RequestDispatchMessages` accepts. Matches the DevTools store's default history size, so a batch cannot evict its own earliest entries before the caller reads them back. The runtime rejects a larger batch with `ResponseError`, and MCP clients reject it earlier still, at their own input boundary. */
export const MAX_DISPATCH_BATCH_SIZE = 100

/** A request from the MCP server. Request.RequestListRuntimes is handled at the Vite plugin layer; all other requests are routed to a browser runtime. */
export const Request = defineTaggedUnion({
  RequestGetModel: {
    maybePath: S.OptionFromNullOr(S.String),
    expand: S.Boolean,
  },
  RequestGetModelAt: {
    index: S.Number,
    maybePath: S.OptionFromNullOr(S.String),
    expand: S.Boolean,
  },
  RequestListMessages: {
    limit: S.Number,
    maybeSinceIndex: S.OptionFromNullOr(S.Number),
    maybeChangedPathsMatch: S.OptionFromNullOr(S.Array(S.String)).pipe(
      S.withDecodingDefault(Effect.succeed(null)),
    ),
    fromEnd: S.Boolean.pipe(S.withDecodingDefault(Effect.succeed(false))),
  },
  RequestCountMessagesByTag: {
    maybeSinceIndex: S.OptionFromNullOr(S.Number),
    maybeChangedPathsMatch: S.OptionFromNullOr(S.Array(S.String)),
  },
  RequestDiffModels: {
    fromIndex: S.Number,
    toIndex: S.Number,
    maybeChangedPathsMatch: S.OptionFromNullOr(S.Array(S.String)),
  },
  RequestGetMessage: { index: S.Number },
  RequestListKeyframes: {},
  RequestReplayToKeyframe: { keyframeIndex: S.Number },
  RequestResume: {},
  RequestDispatchMessage: { message: S.Unknown },
  RequestDispatchMessages: { messages: S.Array(S.Unknown) },
  RequestListRuntimes: {},
  RequestGetInit: {},
  RequestGetRuntimeState: {},
  RequestGetMessageSchema: { maybeVariantTag: S.OptionFromNullOr(S.String) },
})
/** A request from the MCP server. */
export type Request = typeof Request.Type

// RESPONSE

/** One row of a Message-tag histogram. */
export const MessageTagCount = S.Struct({
  tag: S.String,
  count: S.Number,
})
/** One row of a Message-tag histogram. */
export type MessageTagCount = typeof MessageTagCount.Type

/** The value on one side of a Model diff path. */
export const DiffValue = defineTaggedUnion({
  Absent: {},
  Present: { value: S.Unknown },
})
/** The value on one side of a Model diff path. */
export type DiffValue = typeof DiffValue.Type

/** One changed path in a Model diff. `before` is the value at `fromIndex`, `after` the value at `toIndex`. */
export const ModelDiffChange = S.Struct({
  path: S.String,
  before: DiffValue,
  after: DiffValue,
})
/** One changed path in a Model diff. */
export type ModelDiffChange = typeof ModelDiffChange.Type

/** One variant entry in a `MessageSchemaIndex`. `payloadFields` lists the variant's payload property names (excluding `_tag`); `unionFields` lists the subset of those properties whose schemas are themselves `_tag`-discriminated unions. A Submodel-wrapper variant always shows up with `unionFields: ['message']`, but the same flag also catches plain tagged-union value types like `UrlRequest = Internal | External`. Either way, the agent will need to pick a variant when filling these fields. */
export const MessageSchemaIndexEntry = S.Struct({
  tag: S.String,
  payloadFields: S.Array(S.String),
  unionFields: S.Array(S.String),
})
/** One variant entry in a `MessageSchemaIndex`. */
export type MessageSchemaIndexEntry = typeof MessageSchemaIndexEntry.Type

/** A flat directory of every top-level Message variant the runtime accepts, designed to fit in an agent context regardless of Message-union size. Use the tag names to make a follow-up `RequestGetMessageSchema` with `maybeVariantTag` set to fetch the full JSON Schema for one variant. */
export const MessageSchemaIndex = S.Struct({
  variants: S.Array(MessageSchemaIndexEntry),
})
/** A flat directory of every top-level Message variant. */
export type MessageSchemaIndex = typeof MessageSchemaIndex.Type

/** The result payload carried by `ResponseMessageSchema`. */
export const MessageSchemaResult = defineTaggedUnion({
  MessageSchemaIndexResult: { index: MessageSchemaIndex },
  MessageSchemaDocumentResult: { document: S.Unknown },
})
/** The result payload carried by `ResponseMessageSchema`. */
export type MessageSchemaResult = typeof MessageSchemaResult.Type

/** A response replying to a Request. */
export const Response = defineTaggedUnion({
  ResponseModel: { value: S.Unknown, atPath: S.String, summarized: S.Boolean },
  ResponseMessages: {
    entries: S.Array(SerializedEntry),
    maybeNextIndex: S.OptionFromNullOr(S.Number),
  },
  ResponseMessage: { entry: SerializedEntry },
  ResponseMessageCounts: {
    counts: S.Array(MessageTagCount),
    totalCount: S.Number,
    scannedFromIndex: S.Number,
    scannedToIndex: S.Number,
  },
  ResponseModelDiff: {
    fromIndex: S.Number,
    toIndex: S.Number,
    changes: S.Array(ModelDiffChange),
  },
  ResponseKeyframes: { keyframes: S.Array(KeyframeInfo) },
  ResponseReplayed: { model: S.Unknown },
  ResponseResumed: {},
  ResponseDispatched: { acceptedAtIndex: S.Number },
  ResponseDispatchedBatch: { acceptedAtIndices: S.Array(S.Number) },
  ResponseRuntimes: { runtimes: S.Array(RuntimeInfo) },
  ResponseInit: {
    maybeModel: S.OptionFromNullOr(S.Unknown),
    commands: S.Array(SerializedCommand),
    mountStarts: S.Array(SerializedMount),
  },
  ResponseRuntimeState: {
    currentIndex: S.Number,
    startIndex: S.Number,
    totalEntries: S.Number,
    isPaused: S.Boolean,
    maybePausedAtIndex: S.OptionFromNullOr(S.Number),
    hasInitModel: S.Boolean,
  },
  ResponseMessageSchema: {
    maybeResult: S.OptionFromNullOr(MessageSchemaResult),
  },
  ResponseError: { reason: S.String },
})
/** A response replying to a Request. */
export type Response = typeof Response.Type

// EVENT

/** A runtime lifecycle event used by the Vite plugin to track which browser tabs are connected. Not forwarded to MCP clients. */
export const Event = defineTaggedUnion({
  EventConnected: { runtime: RuntimeInfo },
  EventDisconnected: { connectionId: S.String },
})
/** A runtime lifecycle event. */
export type Event = typeof Event.Type

// FRAME

/** A wire frame carrying a Request from the MCP server. The id is opaque, used only by the MCP server to correlate the matching Response. The maybeConnectionId routes the request to a specific runtime when present. */
export const RequestFrame = S.Struct({
  id: S.String,
  maybeConnectionId: S.OptionFromNullOr(S.String),
  request: Request,
})
/** A wire frame carrying a Request from the MCP server. */
export type RequestFrame = typeof RequestFrame.Type

/** A wire frame carrying a Response, correlated to a Request by id. */
export const ResponseFrame = S.Struct({
  id: S.String,
  response: Response,
})
/** A wire frame carrying a Response, correlated to a Request by id. */
export type ResponseFrame = typeof ResponseFrame.Type

/** A wire frame carrying a runtime lifecycle event from the bridge to the Vite plugin. */
export const EventFrame = S.Struct({
  maybeConnectionId: S.OptionFromNullOr(S.String),
  event: Event,
})
/** A wire frame carrying a runtime lifecycle event. */
export type EventFrame = typeof EventFrame.Type
