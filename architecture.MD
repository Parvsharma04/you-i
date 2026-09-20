# Architecture Overview

## 1. System goals

You & I is a multiplayer compatibility quiz game with three runtime surfaces:

- `apps/api`: the authoritative backend for game state, persistence and AI result generation
- `apps/mobile`: the native client for Play/Android/iOS users
- `apps/web`: the legacy browser/share-link UI kept for links and landing flows
- `packages/shared`: the common contract package for request/response validation and socket payloads

The design decision is clear: the server is the source of truth. Sockets are used for live hints and UX updates, but rehydration and final state always come from REST and the database.

## 2. Monorepo structure

```text
apps/
  api/         NestJS API server
  mobile/      Expo + React Native app
  web/         Next.js browser implementation
packages/
  shared/      Zod schemas, shared types, socket events
```

This is a workspace-driven monorepo. Shared contracts are intentionally centralized so the native client and the web client cannot drift on request/response shapes or socket events without a type-level change.

## 3. Shared contract layer

`packages/shared` is the critical architectural boundary.

It owns:

- request/response Zod schemas
- Prisma-facing session and result types
- socket event names and payload types
- player-role and category enums
- constants like player-id and device-id headers

This keeps the API and the mobile client aligned and ensures that client/server validation fails early when a contract is broken.

## 4. Backend architecture (`apps/api`)

### Runtime and framework

- NestJS application bootstrap via `src/main.ts`
- Global `ZodValidationPipe` for request validation
- Helmet for response hardening
- CORS configured from a dedicated config layer
- Throttler guard enabled globally with service-specific overrides for expensive operations

### Module layout

```text
AppModule
  PrismaModule
  SessionModule
  QuestionModule
  AnswerModule
  ResultModule
  GatewayModule
  LlmModule
  HealthModule
```

### Core responsibilities

- `SessionModule`: create, join, regenerate room code, list sessions, cancel waiting sessions
- `QuestionModule`: expose the quiz question set for a given session
- `AnswerModule`: store answers and compute progress/answer counts
- `ResultModule`: generate and return compatibility summaries
- `GatewayModule`: real-time room events for join/answer/progress signaling
- `LlmModule`: AI result generation abstraction for provider-backed analysis
- `HealthModule`: server and database health endpoints

### Source-of-truth model

The backend owns all durable state:

- session metadata
- players and roles
- question assignment
- per-answer submissions
- final compatibility result

Sockets are not the canonical state store. They merely broadcast updates such as “player joined”, “answer submitted”, or “player complete” to the connected clients.

## 5. Persistence model

The database is modeled through Prisma.

Key decisions in the schema:

- `Session` identifies the game container
- `SessionPlayer` represents a player attached to a session and stores role + device association
- `Question` stores question payloads for a session
- `Answer` stores player answers keyed by `sessionId + questionId + playerId`
- `Result` stores final score and narrative analysis

This normalized player model is important: player identity is not stored as a pair of scalar `player1Id` / `player2Id` fields on the session row. The normalized pattern allows room membership, join constraints and identity checks to be enforced consistently.

## 6. Request/response security model

The API enforces identity in a few ways:

- `X-Player-Id` header is the protected bearer-style identifier for session membership checks
- `X-Device-Id` header is used for session ownership, host checks and join flows
- `PlayerGuard` rejects callers who are not attached to the session
- `Zod` validates the shape of request bodies and outgoing response payloads in shared schemas
- rate limiting is applied globally and tightened around expensive LLM operations

This is a deliberate security choice: a player must prove both identity and session membership before they can mutate state.

## 7. Real-time communication

The real-time layer uses Socket.IO.

### Server-side socket behavior

The gateway handles events like:

- `joinRoom`
- `submitAnswer`
- `quizComplete`

It broadcasts server-originated hints like:

- `playerJoined`
- `answerSubmitted`
- `playerComplete`
- `resultsReady` (present in the contract and server code, but not used as a primary client path in the shipped web UX)

### Architectural rule

Socket events are advisory only. They help the UI update immediately while the backend is still the place where correctness is enforced.

The mobile client must handle disconnect/reconnect and rehydrate from REST, because a dropped socket does not mean the game state is lost.

## 8. Mobile app architecture (`apps/mobile`)

### Platform choices

- Expo Router for navigation
- NativeWind for styling
- Expo secure storage for sensitive values
- `react-native-reanimated` and native UI primitives where animation is required
- Socket.IO client for multiplayer signaling
- `@youandi/shared` for all API contracts and event payloads

### Important platform decisions

- `expo-secure-store` is the required storage mechanism for player IDs and session records
- The app avoids browser-only APIs such as `window`, `document`, `navigator`, and `localStorage`
- The app treats sockets as opportunistic live hints and then re-syncs with REST on reconnect or screen focus
- All environment values are validated at runtime from `app.config.ts` extras

### State handling

The mobile app stores:

- active session id
- session index
- device id
- player session record (sessionId, playerId, role, category, questionCount, room code)

The app is designed to survive backgrounding and reconnects. When the socket drops, the app must recover by re-fetching server state instead of trusting stale socket state.

## 9. Web app architecture (`apps/web`)

The web app is a legacy browser implementation. It remains useful for share links and browser-based flows but is not the native target architecture.

Main decisions:

- Next.js App Router screens for landing, lobby, quiz and results
- Browser routing via `next/navigation`
- Browser session storage for ephemeral identity hydration
- `html-to-image` and browser clipboard/share APIs for result export
- classic CSS + Tailwind-driven retro styling

This web layer is intentionally browser-bound and is the main reason a migration to React Native must replace many browser assumptions.

## 10. Runtime flow

### Session create flow

1. client chooses category and question count
2. client posts to `POST /session/create`
3. backend creates session + player record + room code
4. client stores session identity in secure storage or browser session storage
5. user enters lobby or continues in app flow

### Join flow

1. user provides room code or session id
2. client calls `POST /session/join`
3. backend validates device, session and capacity rules
4. backend attaches player role and returns session metadata
5. socket joins the room and UI updates around live presence

### Quiz flow

1. client fetches the interactive question set from the backend
2. user answers one question at a time
3. answer submissions are persisted via REST
4. socket broadcasts a lightweight hint to peers
5. final progression is derived from aggregated answer counts and session state

### Results flow

1. session is considered complete when answer state is sufficient
2. client triggers result generation
3. backend runs AI analysis asynchronously and persists the result
4. client polls or rehydrates the result endpoint and displays the score card

## 11. Technical decisions and trade-offs

### Decision: server authoritative

This is the most important architecture choice. The backend owns all state transitions. The UI may be optimistic, but it must be able to reconcile with the server.

### Decision: native-safe storage only

The mobile client must use secure storage for secrets and user state. Browser local/session storage is not acceptable.

### Decision: shared schema contract

The shared package prevents the app and server from drifting on the API shape. It is the compatibility boundary for the migration.

### Decision: socket as hint layer

Sockets are used for responsiveness, not truth. The app must rehydrate state from REST after reconnects.

### Decision: strong validation and fail-fast config

The API validates environment variables and request payloads early, so configuration errors surface immediately instead of later in a request path.

## 12. Migration implications

The native app architecture is already aligned with the long-term rules of the product:

- no browser-only APIs in mobile views
- app state persisted via secure storage
- server as authority
- sockets as notifications only
- shared contracts for all payloads

The legacy web app is where the drift and browser-specific logic live. The migration should treat the web implementation as a compatibility reference, not as the target runtime model for the mobile app.
