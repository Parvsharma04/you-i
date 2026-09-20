# MIGRATION AUDIT — You & I (Next.js → React Native)

## 1. ROUTES

| File path | URL pattern | What it renders | What data it fetches | Lifecycle point |
|---|---|---|---|---|
| `apps/web/src/app/page.tsx` | `/` | Landing screen: category selector, question-count selector, join-by-code form, create-game CTA | No initial REST fetch. On click: `api.createSession(category, questionCount)` then stores `sessionStorage.player_${sessionId}` | On click (`handleStart` / `handleJoin`) after user interaction |
| `apps/web/src/app/j/[code]/page.tsx` | `/j/[code]` | Join-by-link screen: display code, CTA to join room | On click: `api.joinSession(code.trim())` | On click (`handleJoin`) after user interaction |
| `apps/web/src/app/lobby/[sessionId]/page.tsx` | `/lobby/[sessionId]` | Invitation landing: install-app pitch or continue-in-browser state | `api.getSession(sessionId)`; `sessionStorage.getItem("player_${sessionId}")` for local identity | `api.getSession` in `useEffect` on mount; `sessionStorage` check in state initializer; redirect to `/quiz/${sessionId}` once session status becomes `active` and the browser flow continues |
| `apps/web/src/app/lobby/[sessionId]/lobby-browser.tsx` | `/lobby/[sessionId]` (browser flow) | In-browser lobby: room code, waiting UI, auto-redirect to quiz | `api.getSession(sessionId)` on join event and initial props; socket `playerJoined` event triggers `api.getSession` refresh | Socket event listener is mounted when `playerInfo` exists; auto-redirect when `session.status === 'active'` after `setTimeout(..., 1500)` |
| `apps/web/src/app/quiz/[sessionId]/page.tsx` | `/quiz/[sessionId]` | One-question-at-a-time quiz, answer selection, waiting-for-p2 overlay, results redirect | `api.getQuestions(sessionId)` on mount; `api.submitAnswer(...)` on submit; `api.getAnswerCount(sessionId)` after final answer; `sessionStorage` reads player info | `getQuestions` in `useEffect` on mount; `submitAnswer` on button click; `getAnswerCount` after the last answer is submitted; socket `answerSubmitted`/`playerComplete` listeners are mounted with `playerInfo` |
| `apps/web/src/app/results/[sessionId]/page.tsx` | `/results/[sessionId]` | Score display, summary, strengths, differences, share card, image/WhatsApp copy | `sessionStorage` player lookup; `api.getResult(sessionId, playerId)`; if empty, `api.generateResult(sessionId, playerId)` | `loadResults` runs in `useEffect` on mount; `generateResult` is triggered conditionally when a result is absent |

## 2. WEB-ONLY APIS

| File:line | API / construct | What it is being used for |
|---|---|---|
| `apps/web/src/lib/device-id.ts:15,18` | `window.localStorage.getItem`, `window.localStorage.setItem` | Persists a stable browser device ID used for `x-device-id` in API calls. Breaks on RN because React Native does not expose `window.localStorage`. |
| `apps/web/src/app/page.tsx:4` | `useRouter` from `next/navigation` | Browser routing. Not available in React Native unless you replace with Expo Router or React Navigation. |
| `apps/web/src/app/page.tsx:35,52` | `sessionStorage.setItem` | Stores `{ playerId, isHost }` under a per-session key so the page can recover identity. |
| `apps/web/src/app/j/[code]/page.tsx:3,8,20` | `useParams`, `useRouter`, `sessionStorage.setItem` | Reads route param `code` and stores player identity after a code-based join. |
| `apps/web/src/app/lobby/[sessionId]/page.tsx:4,16,23` | `useRouter`, `sessionStorage.getItem`, `typeof window === 'undefined'` | Reads the browser's session-scoped player state to decide whether to continue in-browser or show install UI. |
| `apps/web/src/app/lobby/[sessionId]/lobby-browser.tsx:4,21,31` | `useRouter`, `sessionStorage.getItem` | Rehydrates player identity from the browser session, then auto-routes to quiz once the server marks the lobby active. |
| `apps/web/src/app/quiz/[sessionId]/page.tsx:4,35` | `useRouter`, `sessionStorage.getItem` | Reads player identity; if missing, redirects to `/lobby/${sessionId}`. |
| `apps/web/src/app/results/[sessionId]/page.tsx:4,5` | `useRouter` from `next/navigation`; `toBlob` from `html-to-image` | Browser routing and DOM-to-image capture of the share card. Entirely browser-dependent. |
| `apps/web/src/app/results/[sessionId]/page.tsx:24` | `sessionStorage.getItem` | Reads session player ID before fetching/generating the result. |
| `apps/web/src/app/results/[sessionId]/page.tsx:68` | `window.location.origin` | Builds the shareable `shareLink` URL. |
| `apps/web/src/app/results/[sessionId]/page.tsx:76` | `navigator.clipboard.writeText` | Copies the share text to the clipboard. |
| `apps/web/src/app/results/[sessionId]/page.tsx:89` | `window.open` | Opens WhatsApp share URL in a browser tab. |
| `apps/web/src/app/results/[sessionId]/page.tsx:100-128` | `toBlob`, `navigator.canShare`, `navigator.share`, `URL.createObjectURL`, `document.createElement('a')`, `a.click()`, `URL.revokeObjectURL` | Capture a PNG share image, attempt native share, or fallback to browser download. This is a direct React Native incompatibility. |
| `apps/web/src/components/SoundtrackPlayer.tsx:4,46` | `usePathname` from `next/navigation` | Route-based audio selection keyed off `pathname`. |
| `apps/web/src/components/SoundtrackPlayer.tsx:74` | `new Audio()` | Browser HTMLAudioElement for soundtrack playback. RN needs `expo-av` or a native audio package. |
| `apps/web/src/components/SoundtrackPlayer.tsx:261` | `<style jsx global>` | Inline CSS keyframes for the audio bar visualizer. Not valid in RN. |
| `apps/web/src/app/layout.tsx:1,2,8` | `Metadata` export from `next`; `html`, `body` tags; `SoundtrackPlayer` import | This is Next document structure, not a React Native screen. |
| `apps/web/src/lib/useSocket.ts:8` | `import { io, Socket } from 'socket.io-client'` | Browser socket client; cross-platform but the actual transport is browser-oriented and not a native app runtime default. |
| `apps/web/src/app/page.tsx:4`, `apps/web/src/app/j/[code]/page.tsx:3`, `apps/web/src/app/quiz/[sessionId]/page.tsx:4`, `apps/web/src/app/lobby/[sessionId]/page.tsx:4`, `apps/web/src/app/results/[sessionId]/page.tsx:4`, `apps/web/src/components/SoundtrackPlayer.tsx:4` | `next/navigation` imports | This is the strongest indicator that the app is built around Next-specific routing and browser context. |
| `apps/web/src/app/results/[sessionId]/page.tsx:5` | `html-to-image` dependency | DOM capture and rasterization library; will not run on React Native as-is. |

## 3. STYLING

### 3.1 Active CSS files and dead CSS

| File | Status | Notes |
|---|---|---|
| `apps/web/src/app/globals.css` | Active | Imported in `apps/web/src/app/layout.tsx`; drives the actual theme. |
| `apps/web/src/app/lobby/[sessionId]/lobby.module.css` | Dead code | Exists but not imported anywhere; actual lobby page uses Tailwind classes only. |
| `apps/web/src/app/quiz/[sessionId]/quiz.module.css` | Dead code | Same as above. |
| `apps/web/src/app/results/[sessionId]/results.module.css` | Dead code | Same as above. |

### 3.2 Theme tokens actually in use

| CSS variable | Real hex | Used for |
|---|---|---|
| `--bg-primary` | `#fff0f5` | Page background |
| `--bg-secondary` | `#ffe4e1` | Grid + secondary surfaces |
| `--bg-card` | `#ffffff` | Cards / buttons |
| `--text-primary` | `#8b0000` | Primary heading/body text |
| `--text-secondary` | `#a52a2a` | Secondary body text |
| `--text-muted` | `#cd5c5c` | Lower-priority labels |
| `--accent-color` | `#ff1493` | CTA + highlights |
| `--border-color` | `#8b0000` | Border + shadow stroke |

Source: `apps/web/src/app/globals.css:3-12` (active theme = Love & Romance as defined in `design.md`).

### 3.3 Tailwind config and families

| Setting | Actual value |
|---|---|
| `fontFamily.display` | `['VT323', 'monospace']` |
| `fontFamily.body` | `['Space Mono', 'monospace']` |
| `boxShadow.retro` | `4px 4px 0px var(--border-color)` |
| `boxShadow.retro-hover` | `2px 2px 0px var(--border-color)` |
| `boxShadow.retro-sm` | `3px 3px 0px var(--border-color)` |
| `boxShadow.retro-lg` | `6px 6px 0px var(--border-color)` |
| `colors.bg-primary` | `var(--bg-primary)` |
| `colors.bg-secondary` | `var(--bg-secondary)` |
| `colors.bg-card` | `var(--bg-card)` |
| `colors.text-primary` | `var(--text-primary)` |
| `colors.text-secondary` | `var(--text-secondary)` |
| `colors.text-muted` | `var(--text-muted)` |
| `colors.accent` | `var(--accent-color)` |
| `colors.border-color` | `var(--border-color)` |

`apps/web/src/app/globals.css` also imports Google Fonts:
- `VT323`
- `Space Mono` (`400`, `700` only)

### 3.4 Spacing, border radii, and radius rules

| Design rule | Actual value |
|---|---|
| Container max width | `480px` (`.container-custom`) |
| Box spacing used in code | `4px`, `8px`, `10px`, `12px`, `16px`, `18px`, `20px`, `24px`, `32px`, `40px`, `60px` |
| Border radius | Essentially none; default is `rounded-none` across the live app |
| Border widths | `2px`, `3px`, `4px`, `6px` |
| Share card size | `450px × 800px` with `padding: '60px 40px'` |

The design is intentionally anti-rounded: `rounded-none` is used overwhelmingly. The only obvious `rounded-full` uses are the spinner and audio-CD widgets. There are no live design tokens for a conventional 4/8pt scale; the app mixes Tailwind's default spacing utilities and literal pixel sizes (`style={{ gap: '32px' }}`, `padding: '60px 40px'`, etc.).

### 3.5 Keyframes and animations currently in use

| Animation | Defined in | Actual behavior |
|---|---|---|
| `blink` | `apps/web/src/app/globals.css` | `1s infinite`, opacity toggles 1↔0; used by `.waiting-dots span` |
| `fadeInUp` | `apps/web/src/app/globals.css` and `apps/web/tailwind.config.ts` | Lives in both raw CSS and Tailwind config; call sites override duration inline (`0.5s`, `0.6s`, `0.8s`) |
| `fadeIn` | `apps/web/src/app/globals.css` and `apps/web/tailwind.config.ts` | Used on quiz and loading states; call sites override timing |
| `bounceIn` | `apps/web/src/app/globals.css` and `apps/web/tailwind.config.ts` | Used in result score and stage-clear states |
| `barHeight1`, `barHeight2`, `barHeight3` | `apps/web/src/components/SoundtrackPlayer.tsx` inline `<style jsx global>` | Audio visualizer bars; not part of the shared design system |
| `spin` | Tailwind default / arbitrary animation | Used once for `.spinner` and again in the CD icon |

## 4. BACKEND SURFACE

### 4.1 Validation and middleware

| Concern | Actual implementation |
|---|---|
| Global validation | `apps/api/src/main.ts` uses `app.useGlobalPipes(new ZodValidationPipe())` |
| Validation scope | Only `@Body()` params whose metatype is created by `createZodDto(...)` are validated. Path/query params are not validated by the global pipe. |
| CORS | `buildCorsOptions()` from `apps/api/src/common/cors.config.ts` |
| Auth | `PlayerGuard` enforces `X-Player-Id` header for protected routes; `deviceId` is required for host + join flows. |

### 4.2 Controller routes and exact shapes

| Route | Request shape | Validation | Success response | Status codes | Error paths |
|---|---|---|---|---|---|
| `POST /session/create` | `{ category: string, questionCount: number }` via `CreateSessionDto` from `createSessionRequestSchema` | `category` must be one of `love|friendship|deep_talk|fun|spicy|fantasy|interests`; `questionCount` must be integer `5..20` | `{ sessionId: string, playerId: string, code: string, questionIds: number[] }` | `201` on success | `400` if `x-device-id` missing or body invalid; `Throttle` applies 3 requests/60s |
| `POST /session/join` | `{ code?: string, sessionId?: string, passAndPlay?: boolean }` | `code` or `sessionId` required; DTO allows either; `x-device-id` required | `{ sessionId: string, playerId: string, role: 'player1' | 'player2', category: string, questionCount: number }` | `201` when a player is matched/claimed | `400` if missing `x-device-id` or invalid join state; `404` if session not found; `JoinSessionException` for `CODE_NOT_FOUND`, `CODE_EXPIRED`, `SELF_JOIN`, `SESSION_FULL`, etc. |
| `POST /session/:id/regenerate-code` | `:id` path param | `x-device-id` required; session owner must be player1 | `{ code: string, expiresAt: string }` | `200` | `400` if caller is not host or session not waiting; `404` if session missing |
| `DELETE /session/:id` | `:id` path param | `x-device-id` required; only host can cancel while waiting | `{ deleted: true }` | `200` | `400` if not host or lobby not waiting; `404` if session missing |
| `GET /session/:sessionId/state` | `:sessionId` path param; header `X-Player-Id` required | `PlayerGuard` checks that the caller belongs to the session | `{ session: { id, category, questionCount, status, createdAt }, you: { playerId, role, answeredQuestionIds }, partner: { joined, answeredQuestionIds, complete }, questions: [{ id, text, type, options }], result: { status: 'none'|'pending'|'ready', data: { score, summary, strengths, differences } | null } }` | `200` | `400` if `sessionId` missing; `403` if player not in session; `404` if session missing |
| `GET /session/:id` | `:id` path param | none | Prisma `Session` row, e.g. `{ id, category, questionCount, status, code, codeExpiresAt, startedAt, lastActivityAt, createdAt }` | `200` | `404` if session missing |
| `GET /sessions/mine` | Header `x-device-id` required | `deviceId` must be present | Array of session summaries: `{ id, category, status, statusLabel, questionCount, role, playerId, partnerJoined, yourAnswerCount, partnerAnswerCount, totalExpected, passAndPlay, lastActivityAt, createdAt }` | `200` | `400` if `x-device-id` missing |
| `GET /question/:sessionId` | `:sessionId` path param | none | `Array<{ id: number, text: string, type: 'mcq' | 'text', options: string[] | null }>` | `200` | `404` if session missing |
| `POST /answer` | `{ sessionId: string, questionId: number, playerId?: string, answer: string }` | `PlayerGuard` reads `X-Player-Id` header; body `playerId` is legacy fallback only | Prisma `Answer` row: `{ id, sessionId, questionId, playerId, answer }` | `201` | `400` if session missing or player not in session; `403` if `X-Player-Id` mismatch; `422`/`400` from Zod if DTO body invalid |
| `GET /answer/:sessionId` | `:sessionId` path param | none | `Array<{ id, sessionId, questionId, playerId, answer }>` ordered by `questionId` asc | `200` | Empty array for unknown session; no 404 guard |
| `GET /answer/:sessionId/count` | `:sessionId` path param | none | `{ player1: number, player2: number, totalExpected: number, bothComplete: boolean }` | `200` | `400` if session missing |
| `POST /result/generate/:sessionId` | `:sessionId` path param; header `X-Player-Id` required | `PlayerGuard` validates session membership | `{ status: 'ready'|'pending', data: { score, summary, strengths, differences } | null }` | `200` when result already exists; `202` when generation started/pending | `400` if session missing or player2 has not joined; `404` if session missing in deeper service paths |
| `GET /result/:sessionId` | `:sessionId` path param; header `X-Player-Id` required | `PlayerGuard` validates session membership | `{ status: 'ready'|'pending'|'none', data: { score, summary, strengths, differences } | null }` | `200` | `403`/`404` from `PlayerGuard` or missing session |
| `GET /health` | none | none | `{ status: 'ok', database: 'up' }` | `200` | `503` with `{ status: 'error', database: 'down' }` if DB probe fails |
| `GET /health/metrics` | none | none | Prometheus metrics text | `200` | none in controller itself |

## 5. SOCKET CONTRACT

| Direction | Event | Exact payload object in code | Authoritative side | Where defined |
|---|---|---|---|---|
| Client → Server | `joinRoom` | `{ sessionId: string, playerId: string }` | Server validates membership against `SessionPlayer`; this is the enforceable join gate | `packages/shared/src/socket.ts`, `apps/api/src/gateway/quiz.gateway.ts`, `apps/web/src/lib/useSocket.ts` |
| Client → Server | `submitAnswer` | `{ sessionId: string, playerId: string, questionId: number, answerIndex: number }` | The actual answer persistence is authoritative in REST (`POST /answer`), not the socket payload | `packages/shared/src/socket.ts`, `apps/web/src/lib/useSocket.ts`, `apps/api/src/gateway/quiz.gateway.ts` |
| Client → Server | `quizComplete` | `{ sessionId: string, playerId: string }` | The server does not persist completion; the authoritative state is the aggregated answer count from REST (`GET /answer/:sessionId/count`) | `packages/shared/src/socket.ts`, `apps/web/src/lib/useSocket.ts`, `apps/api/src/gateway/quiz.gateway.ts` |
| Server → Client | `playerJoined` | `{ playerId: string }` | Server is authoritative for room membership broadcast | `apps/api/src/gateway/quiz.gateway.ts` |
| Server → Client | `answerSubmitted` | `{ playerId: string, questionId: number, answerIndex: number }` | This is a hint/UI signal only; the canonical answer state is REST/DB | `apps/api/src/gateway/quiz.gateway.ts` |
| Server → Client | `playerComplete` | `{ playerId: string }` | Hint/UI signal only; not authoritative for result generation or game completion | `apps/api/src/gateway/quiz.gateway.ts` |
| Server → Client | `resultsReady` | `{ score: number, summary: string, strengths: string[], differences: string[] }` | This is the server result payload; currently dead code in the live implementation | `packages/shared/src/socket.ts`, `apps/api/src/gateway/quiz.gateway.ts`, `apps/api/src/result/result.service.ts` |

Notes:
- The client registers `on('answerSubmitted', ...)` and `on('playerComplete', ...)` but does not subscribe to `resultsReady`.
- The server calls `this.quizGateway.emitResultsReady(sessionId, persisted);` in `ResultService.generateInBackground`, but the app does not listen for it anywhere in the current web client.
- The architecture doc describes `resultsReady` as a live event; in code it is not a current user-visible signal, only a dead method stub in the gateway plus a typed schema in `packages/shared/src/socket.ts`.

## 6. DRIFT

| Drift | Evidence | Impact |
|---|---|---|
| 1. Architecture says the `Session` table stores `player1Id` and `player2Id` | Real schema: `apps/api/prisma/schema.prisma` has `SessionPlayer` with `playerId`, `role`, `deviceId`, and unique constraints on `(sessionId, role)` and `(sessionId, playerId)`. `Session` itself has no `player1Id`/`player2Id` columns. | All player identity assumptions in the doc are stale. The server is using a normalized player table, not a flat 2-column session row. |
| 2. The architecture doc promises `shareLink` in create/join responses | Actual `CreateSessionResponse` and `JoinSessionResponse` in `packages/shared/src/schemas.ts` do not include `shareLink`. `apps/web/src/lib/api.ts` returns `{ sessionId, playerId, code, questionIds }` and `{ sessionId, playerId, role, category, questionCount }`. | The docs are out of sync with the API actually shipped and the web client. |
| 3. The architecture doc says `join` takes `{ sessionId }` but the current API prefers room code | `joinSessionRequestSchema` in `packages/shared/src/schemas.ts` accepts `code` or `sessionId`; `SessionService.join` explicitly prefers `dto.code` and treats legacy `sessionId` as deprecated. | The backend supports both paths, but the shipped UX is code-based, not `sessionId`-based. |
| 4. Architecture says the app reads player IDs from localStorage; actual implementation uses `sessionStorage` and not localStorage | `apps/web/src/app/page.tsx` and `apps/web/src/app/quiz/[sessionId]/page.tsx` use `sessionStorage`, and `apps/web/src/lib/device-id.ts` uses `window.localStorage` for the device ID only | This is a data-lifetime and persistence mismatch. Session state is not meant to survive a browser close; device ID is meant to be persistent. |
| 5. Architecture claims the app is “purely browser-web” with `window.location.origin` share links and full WebSocket-driven progression, but it is actually built around route `next/navigation` and document APIs | `apps/web/src/app/...` pages import `useRouter`, `useParams`, `usePathname`; `apps/web/src/components/SoundtrackPlayer.tsx` uses `new Audio()`, `document` is not used directly but the page uses browser-only share features | This code will not migrate to a native shell without swapping router and browser APIs. |
| 6. The architecture doc says the `Question` model has a `category` field and `GET /question/:sessionId` returns `category` | Actual Prisma `Question` model in `apps/api/prisma/schema.prisma` has no `category` column. The shared `questionSchema` includes `category` but the server `QuestionController` returns a question list derived from `QuestionService` without category. | The type contract and DB schema disagree. One side documents a field that is not persisted. |
| 7. Architecture doc says the socket is needed to progress the room when a player joins | Actual `LobbyBrowser` waits for `playerJoined` to call `api.getSession(sessionId)` and then redirects only when `session.status === 'active'` after a timer. It does not immediately change state from the socket itself. | The socket is a hint, not the source of truth; the server state is fetched over REST. |
| 8. Architecture doc says `useSocket` uses `transports: ['websocket', 'polling']`; actual code uses only `['websocket']` | `apps/web/src/lib/useSocket.ts` is hard-coded as `transports: ['websocket']`. | This is a real connectivity mismatch if the deployment environment needs fallback/HTTP polling. |
| 9. Architecture says `GET /result/:sessionId` returns a raw result or `null`; actual code returns `ResultStatusResponse` | The `ResultController` and `ResultService.getResult` both return `{ status, data }`, not the bare result object. | The documented REST contract is stale and the client logic is expecting the newer status wrapper. |
| 10. Architecture says `POST /result/generate/:sessionId` returns the generated result immediately | Actual `ResultController.generate` writes `res.status(alreadyExists ? 200 : 202)` and returns a wrap object. `requestGeneration` returns `status: 'pending'` while generation runs in the background. | The request/response contract is an async orchestration model, not a synchronous “generate and return immediately” model. |
| 11. Architecture says the app creates the result and updates `Session.status` to `completed` on the same request path | Actual generation is fire-and-forget: `requestGeneration()` triggers `generateInBackground()` in the background and responds immediately with `pending`; the `session` update happens later in background generation. | The lifecycle is async and not the one documented in the architecture. |
| 12. Architecture says the socket emits `resultsReady` and clients listen for it | Actual `QuizGateway.emitResultsReady(...)` exists, but the web client never subscribes to it. `apps/web/src/lib/useSocket.ts` `on` helper is used only for `answerSubmitted` and `playerComplete`. | This event is effectively dead code. The app only gets results via REST polling. |
| 13. Architecture says there is no auth/guarding around API routes | The real backend uses `PlayerGuard` and requires `X-Player-Id` for result and answer routes; session creation/join require `x-device-id`. | The runtime API surface is more locked down than the docs claim. |
| 14. The doc describes a session as `waiting -> active -> completed` flow only | Real `Session` status enum includes `waiting | active | completed | expired | abandoned` and the service uses `SESSION_STATUSES.EXPIRED` / `ABANDONED` in `SessionService.findMine` and `classifyJoinFailure`. | The lifecycle is broader and stateful than the docs capture. |
| 15. Architecture says question count is “usually 5-10”, but the actual API allows 5 to 20 and the UI exposes 5/10/15/20 | `createSessionRequestSchema` uses `z.number().int().min(5).max(20)`, and the home screen options are 5, 10, 15, 20. | The architecture document under-specifies the actual production behavior. |
| 16. Architecture says `GET /answer/:sessionId/count` is the only way to know whether both players are done | In the actual web quiz client, a player also subscribes to `playerComplete` and uses the socket progress hint; the server side does not persist completion or enforce a “done” state in the socket itself. | The real state source is split between REST and socket hinting, which is the exact migration risk. |

## 7. STATE OWNERSHIP

| Screen / route | State from REST | State from sockets | State from localStorage / sessionStorage | Socket-drop behavior today |
|---|---|---|---|---|
| `/` | `api.createSession(category, questionCount)` returns `sessionId`, `playerId`, `code` | none | `sessionStorage.player_${sessionId}` stores `{ playerId, isHost }` after create/join | No socket connection exists; nothing breaks. |
| `/j/[code]` | `api.joinSession(code)` returns `sessionId` + `playerId` | none | `sessionStorage.player_${sessionId}` after join | No socket connection exists; nothing breaks. |
| `/lobby/[sessionId]` (install page) | `api.getSession(sessionId)` | `playerJoined` is listened to in the browser flow, not in the install page | `sessionStorage.player_${sessionId}` is checked to decide whether to show install pitch or continue in browser | If the socket drops before the second player joins, the page never refreshes because there is no polling loop; it stays in the waiting state until a manual refresh. |
| `/lobby/[sessionId]` (browser flow) | `api.getSession(sessionId)` on mount and again when `playerJoined` fires | `playerJoined` updates the session; when `session.status === 'active'`, the page redirects to `/quiz/${sessionId}` | `sessionStorage.player_${sessionId}` is used to recover `playerId` and `isHost` | If the socket drops while waiting, there is no REST fallback poll; the UI can remain stuck waiting forever. |
| `/quiz/[sessionId]` | `api.getQuestions(sessionId)`; `api.submitAnswer(...)`; `api.getAnswerCount(sessionId)` after final answer | `answerSubmitted` updates `otherPlayerProgress`; `playerComplete` toggles `waitingForOther` or triggers result redirect | `sessionStorage.player_${sessionId}` holds `{ playerId, isHost }` | If the socket drops mid-game, the other player's progress stops updating; the page may sit in a stale waiting state because there is no periodic REST fallback to refresh completion status. The final completion check is only made after the current player submits the last answer. |
| `/results/[sessionId]` | `api.getResult(sessionId, playerId)` and `api.generateResult(sessionId, playerId)` | none | `sessionStorage.player_${sessionId}` is used to recover the player ID and authorize the fetch | Socket loss is irrelevant; no socket is required. This screen is REST-authoritative. |

Bottom line: the app is already mixed-mode. The server is authoritative for persisted session state, the socket is a hint layer for the lobby and live progress, and the browser is holding player identity in `sessionStorage` rather than a long-lived native store. That split is the key migration risk for all screens.

## UNKNOWN / LOOKUP NOTES

- `apps/web/src/app/layout.tsx` is the root of the Next.js document tree; exact behavior outside the app route files should be checked there if you need the final page-level render hierarchy.
- `apps/web/src/app/results/[sessionId]/page.tsx` uses a hidden share card generated with `html-to-image`; the exact native replacement is not encoded in the current repo and will need a deliberate native-share/PNG export plan.
- `apps/web/src/components/SoundtrackPlayer.tsx` is a browser-only UI layer; no native analog is declared in the repo.
