# MIGRATION AUDIT — You & I (web → native)

Audit date: 2026-09-18. Scope: `frontend/` (Next.js App Router), `backend/` (NestJS), `backend/prisma/schema.prisma`. No files were modified.

---

## 1. ROUTES

All routes are `'use client'` components (no server components, no `getServerSideProps`/`generateMetadata` data fetching). Every fetch happens client-side, in a `useEffect` that runs after mount (i.e., after first paint), using `fetch()` wrapped in `frontend/src/lib/api.ts`.

| File | URL pattern | Renders | Data fetched | Lifecycle point |
|---|---|---|---|---|
| `frontend/src/app/page.tsx` | `/` | Category picker + question-count picker + "START GAME" button | None on load. On click: `api.createSession(category, questionCount)` → `POST /session/create` | On user click (`handleStart`), not on mount |
| `frontend/src/app/lobby/[sessionId]/page.tsx` | `/lobby/[sessionId]` | Invite link (host) / "JOIN GAME" button (guest) / waiting states | `api.getSession(sessionId)` → `GET /session/:id` in a `useEffect` on mount; re-fetched on socket `playerJoined` event; `api.joinSession(sessionId)` → `POST /session/join` on click | `GET /session/:id`: on mount (`useEffect([sessionId])`). Socket connects in the same tick via `useSocket(sessionId, playerInfo?.playerId)`. Re-fetch of session on `playerJoined` socket event (any time after mount). `POST /session/join`: on user click. Auto-redirect to `/quiz/[sessionId]` via `setTimeout(1500ms)` once `session.status === 'active'` |
| `frontend/src/app/quiz/[sessionId]/page.tsx` | `/quiz/[sessionId]` | One question at a time, MCQ or free-text, progress bars for both players | `api.getQuestions(sessionId)` → `GET /question/:sessionId` on mount; `api.submitAnswer(...)` → `POST /answer` per submit; `api.getAnswerCount(sessionId)` → `GET /answer/:sessionId/count` after last question | Questions fetched on mount (`useEffect([sessionId, router])`). Player identity read synchronously from `sessionStorage` in the same effect (redirects to lobby if missing). Answer POSTed on each "NEXT"/"FINISH" click. Answer-count polled once, only after the *last* question is submitted, to decide whether to redirect immediately or show "waiting for other player" |
| `frontend/src/app/results/[sessionId]/page.tsx` | `/results/[sessionId]` | Animated score, AI summary, strengths/differences tags, hidden 9:16 share card | `api.getResult(sessionId)` → `GET /result/:sessionId` on mount; if null, `api.generateResult(sessionId)` → `POST /result/generate/:sessionId` | Both calls happen in a single mount-time `useEffect`, sequentially (`getResult` then conditionally `generateResult`). No socket use on this screen at all — see DRIFT §6 and STATE OWNERSHIP §7 |

No dynamic/static route uses `generateStaticParams`, `generateMetadata` per-route (only a static root `metadata` export in `layout.tsx`), middleware, or route handlers (`app/api/*`) — confirmed by `git ls-files` showing no `route.ts` anywhere in `frontend/src/app`.

---

## 2. WEB-ONLY APIS

Exhaustive grep-verified list of DOM/browser-only usage. Everything below breaks or needs a native shim under React Native.

| File:Line | API | Used for |
|---|---|---|
| `frontend/src/app/page.tsx:31` | `sessionStorage.setItem` | Persists `{ playerId, isHost }` under key `player_${sessionId}` after creating a session |
| `frontend/src/app/lobby/[sessionId]/page.tsx:32` | `sessionStorage.getItem` | Reads stored player identity on mount to know if the current browser is P1/P2 |
| `frontend/src/app/lobby/[sessionId]/page.tsx:75` | `sessionStorage.setItem` | Persists P2 identity right after `POST /session/join` succeeds |
| `frontend/src/app/lobby/[sessionId]/page.tsx:83` | `window.location.origin` | Builds `shareLink` (`${origin}/lobby/${sessionId}`) |
| `frontend/src/app/lobby/[sessionId]/page.tsx:88` | `navigator.clipboard.writeText` | "COPY" button — copies invite link |
| `frontend/src/app/lobby/[sessionId]/page.tsx:93-97` | `document.createElement('input')`, `document.body.appendChild/removeChild`, `input.select()`, `document.execCommand('copy')` | Legacy clipboard fallback if `navigator.clipboard` throws |
| `frontend/src/app/lobby/[sessionId]/page.tsx:104` | `window.open` | Opens `wa.me` deep link for WhatsApp share |
| `frontend/src/app/quiz/[sessionId]/page.tsx:29` | `sessionStorage.getItem` | Reads player identity; redirects to lobby if absent |
| `frontend/src/app/results/[sessionId]/page.tsx:4` | `import { toBlob } from 'html-to-image'` | DOM-to-canvas rasterization library — entire module is browser-only (relies on `document`, `<canvas>`, `Image`, CSS serialization) |
| `frontend/src/app/results/[sessionId]/page.tsx:56` | `window.location.origin` | Builds share link |
| `frontend/src/app/results/[sessionId]/page.tsx:66,72` | `navigator.clipboard.writeText` | "COPY"/share-text copy (no execCommand fallback here — silently "succeeds" in the catch block even on failure) |
| `frontend/src/app/results/[sessionId]/page.tsx:79` | `window.open` | WhatsApp share deep link |
| `frontend/src/app/results/[sessionId]/page.tsx:91` | `shareCardRef.current` + `toBlob(...)` | Renders the hidden off-screen `<div>` to a PNG blob at `pixelRatio: 3` |
| `frontend/src/app/results/[sessionId]/page.tsx:105` | `navigator.canShare`, `navigator.share` | Native Web Share API (files) — closest existing bridge to RN's `Share`/`react-native-share`, but API shape differs entirely |
| `frontend/src/app/results/[sessionId]/page.tsx:116-120` | `URL.createObjectURL`, `document.createElement('a')`, `a.click()`, `URL.revokeObjectURL` | Fallback "download PNG" flow when Web Share unavailable |
| `frontend/src/components/SoundtrackPlayer.tsx:1` | `'use client'` + `usePathname` from `next/navigation` | Route-driven soundtrack switching keyed on pathname substrings (`/results`, `/lobby`, `/quiz`) |
| `frontend/src/components/SoundtrackPlayer.tsx:38` | `new Audio()` | Browser `HTMLAudioElement` — needs `expo-av`/`react-native-track-player` equivalent |
| `frontend/src/components/SoundtrackPlayer.tsx:79` | `fetch(track.localPath, { method: 'HEAD' })` | Probes whether a local `/public/audio/*.mp3` exists before falling back to a remote CDN URL — depends on Next static file serving under `/public` |
| `frontend/src/components/SoundtrackPlayer.tsx:169` | inline `<style jsx global>` | Next.js `styled-jsx` — not available in RN; keyframes (`barHeight1/2/3`) defined here are **not** in `globals.css` or `tailwind.config.ts` (see DRIFT) |
| `frontend/src/lib/useSocket.ts:1,3` | `'use client'`, `io` from `socket.io-client` | Socket.io client using web transports; works in RN with polyfills but transport list (`['websocket']` in `useSocket.ts` vs `['websocket','polling']` documented) must be revisited — see DRIFT |
| All 4 route files | `'use client'` directive | Every page and the layout's `SoundtrackPlayer` opt out of RSC — implicit signal that the whole tree assumes a DOM runtime |
| `frontend/src/app/*/page.tsx` (all 4) | `next/navigation` (`useRouter`, `usePathname`, `use`) | Next-specific router hooks — no RN equivalent, must be replaced by React Navigation or Expo Router |
| `frontend/src/app/layout.tsx:1,3` | `next/head`-style `Metadata` export, `<html>/<body>` tags | Next document structure, meaningless in RN |
| `frontend/postcss.config.mjs`, `tailwind.config.ts`, `@tailwindcss/postcss` | Tailwind v4 (CSS-based, PostCSS pipeline) | Entire styling approach (arbitrary-value utility classes, CSS custom properties referenced via `var()`) has no RN equivalent; RN needs a StyleSheet/NativeWind translation layer |

No `document.querySelector`, no `localStorage` (project uses **`sessionStorage`** exclusively — note this yourself when planning `AsyncStorage` migration, since `sessionStorage` semantics — cleared per tab/session — differ from `AsyncStorage`'s persistent semantics), no `IntersectionObserver`, no `window.matchMedia`.

---

## 3. STYLING

### CSS files present
| File | Status |
|---|---|
| `frontend/src/app/globals.css` | **Live** — imported once from `layout.tsx` via `import "./globals.css"`, drives the entire app (Tailwind v4 `@import "tailwindcss"`, `@config` pointing at `tailwind.config.ts`, `@layer base/components/utilities`, raw `@keyframes`) |
| `frontend/src/app/lobby/[sessionId]/lobby.module.css` | **Dead code.** Grepped `frontend/src/` for `.module.css` and `styles\.` imports — zero matches. `LobbyPage` uses inline Tailwind classes, not this module |
| `frontend/src/app/quiz/[sessionId]/quiz.module.css` | **Dead code** — same as above |
| `frontend/src/app/results/[sessionId]/results.module.css` | **Dead code** — same as above |

The three `*.module.css` files also reference CSS custom properties that **do not exist anywhere** in `globals.css` or `tailwind.config.ts`: `--font-display`, `--radius-full`, `--bg-glass`, `--border-glass`, `--radius-lg`, `--shadow-retro`. If you resurrect these files for native theming reference, know that they were never wired up and never resolved a real value even on web.

### Tailwind config (`frontend/tailwind.config.ts`)
- `boxShadow`: `retro` = `4px 4px 0px var(--border-color)`, `retro-hover` = `2px 2px 0px var(--border-color)`, `retro-active` = `none`, `retro-sm` = `3px 3px 0px var(--border-color)`, `retro-sm-hover` = `2px 2px 0px var(--border-color)`, `retro-lg` = `6px 6px 0px var(--border-color)`, `input` = `inset 3px 3px 0px rgba(0,0,0,0.1)`
- `fontFamily`: `display: ['VT323', 'monospace']`, `body: ['Space Mono', 'monospace']` — both loaded via Google Fonts `@import` at the top of `globals.css` (`family=VT323&family=Space+Mono:wght@400;700`). Only weights 400/700 of Space Mono are loaded; VT323 has one weight only.
- `colors`: all indirect — `bg-primary/bg-secondary/bg-card/text-primary/text-secondary/text-muted/accent/border-color` each map straight to a `var(--*)` CSS custom property. **No literal hex is defined in the Tailwind config itself** — the literal values live only in `globals.css`'s `:root` block (below). This is intentional per `design.md`'s "theme-agnostic token" system, but it means a naive scan of `tailwind.config.ts` alone will not find the real palette.
- `keyframes`/`animation`: `fadeInUp` (0.8s ease forwards), `fadeIn` (0.6s ease), `bounceIn` (0.8s ease forwards) — durations here **differ from the duplicate keyframes hand-written at the bottom of `globals.css`** (0.5s/0.4s/0.6s used inline via arbitrary Tailwind `animate-[...]` syntax in the actual page components). See DRIFT.

### Live color tokens (`globals.css` `:root`, the only theme currently active — "Love & Romance" per `design.md`)
| Variable | Hex | Role |
|---|---|---|
| `--bg-primary` | `#fff0f5` | Page background (also literal-duplicated at `results/page.tsx:365` as `bg-[#fff0f5]` and again as the `toBlob` capture `backgroundColor` at line 90) |
| `--bg-secondary` | `#ffe4e1` | Grid lines / secondary backgrounds |
| `--bg-card` | `#ffffff` | Card/button backgrounds |
| `--text-primary` | `#8b0000` | Primary text |
| `--text-secondary` | `#a52a2a` | Secondary/body text |
| `--text-muted` | `#cd5c5c` | Metadata/low-priority text |
| `--accent-color` | `#ff1493` | Highlights/selection/CTA — also hardcoded literally (not via var) at `results/page.tsx:249` (`background: '#ff1493'`) and throughout `SoundtrackPlayer.tsx` (`#ff1493` appears 4 times, `#333`, `#ffd1dc`, `white`/`black` literals, `#fff0f5` for the widget chrome) |
| `--border-color` | `#8b0000` | All outlines and hard-shadow color |

`design.md` documents four **additional, currently-inactive** theme presets (Retro Game Boy, Neon Cyberpunk, Vaporwave Sunset, Sunny Brutalist) with their own hex sets — none of these are wired into the codebase; they exist only as copy-paste blocks in the doc. Treat them as design reference only, not shipped code.

### Spacing / sizing scale actually used (pulled from literal Tailwind arbitrary values across components, not a formal scale)
`gap`/`padding` values observed: `4px, 8px(gap-2), 10px, 12px, 16px, 18px, 20px, 24px, 32px, 40px, 60px` — no single consistent 4/8-pt scale; both Tailwind's default spacing (`p-6`, `gap-2`, `gap-3`, `gap-4`) and raw arbitrary pixel values (`style={{ gap: '32px' }}`, `p-10`, `p-[60px_40px]`-style inline styles) are mixed inconsistently. Widths: container max-width `480px` (`.container-custom`), share-card fixed `450px × 800px` (9:16-ish, actually 9:16 ≈ 450:800 ✓).

### Border radii
**None.** Every component explicitly uses `rounded-none` (`btn-primary`, `.glass-card`, `.option-card`, `.category-pill`, `.count-btn`, `.share-btn`, `.toast`, `.progress-bar-container/-fill`, `.score-circle`, `.tag`) except: `.spinner` (`rounded-full`, a CSS spinner), `.pulseRing`-adjacent absent (no radius used), the audio widget's CD/vinyl icon buttons in `SoundtrackPlayer.tsx` (`rounded-full`), and `.playerBadge`'s dead CSS module (`var(--radius-full)`, unresolved/dead). Border widths in play: `2px`, `3px`, `4px`, `6px` (share card only) — never anything else. This "no rounded corners, thick uniform borders" rule is a hard design invariant per `design.md` §"No Rounded Edges" and is followed consistently in shipped code.

### Keyframe/animation inventory (all currently firing, cross-referenced against duplicates)
| Name | Defined in | Duration/easing as defined | Used how |
|---|---|---|---|
| `fadeInUp` | `globals.css` bottom (raw `@keyframes`) **and** `tailwind.config.ts` `animation.fadeInUp` | globals: no duration attached to the raw keyframe itself (duration lives at call site); Tailwind: `0.8s ease forwards` | Called via Tailwind arbitrary syntax with its **own** inline duration per call site, e.g. `animate-[fadeInUp_0.5s_ease_forwards]` (quiz), `animate-[fadeInUp_0.8s_ease_forwards]` (results score section), `animate-[fadeInUp_0.6s_ease_forwards]` (results cards, with `[animation-delay:0.1s/0.2s/0.3s/0.4s]` modifiers) — i.e. the Tailwind `theme.extend.animation.fadeInUp` value is **never actually used**; every call site overrides duration inline |
| `fadeIn` | Same dual-definition pattern | globals: bare; Tailwind: `0.6s ease` | Same pattern — actual call sites use `0.4s ease` (quiz top bar) and `0.6s ease` (results loading state) |
| `bounceIn` | Same dual-definition pattern | globals: bare; Tailwind: `0.8s ease forwards` | Call sites: `0.8s ease forwards` (results emoji) with a `0.3s` delay suffix, `0.8s ease forwards` (quiz "STAGE CLEAR") |
| `blink` | `globals.css` only (not in Tailwind config) | `1s infinite`, opacity 1→0 at 49%/50% | `.waiting-dots span` + staggered `animation-delay: 0.33s/0.66s` for dots 2/3 |
| `spin` | Tailwind built-in (not custom) | Tailwind default `1s linear infinite` | `.spinner` (default), `.pulseRing` overrides to `4s linear infinite` via arbitrary `animate-[spin_4s_linear_infinite]`, `SoundtrackPlayer`'s CD icon also uses `animate-[spin_4s_linear_infinite]` |
| `barHeight1`/`barHeight2`/`barHeight3` | **Only** inside `SoundtrackPlayer.tsx`'s `<style jsx global>` block | `0.8s/0.6s/0.9s ease infinite` | Audio visualizer bars — completely separate from the design-system's `globals.css`/`tailwind.config.ts`, i.e. a third, undocumented location for animation definitions |

**Net finding:** animation keyframes are defined in three disconnected places (`globals.css` raw CSS, `tailwind.config.ts` `theme.extend`, and a component-local `styled-jsx` block), with the Tailwind config's duration values never actually consumed. Any native reimplementation should standardize on the **call-site durations** listed above, not the config's stated defaults.

---

## 4. BACKEND SURFACE

All controllers are plain `@Controller()` classes with **no guards, no auth, no rate limiting, no interceptors** anywhere in `backend/src/`. Global `ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } })` is the only cross-cutting concern (`backend/src/main.ts`). CORS is locked to a single `FRONTEND_URL` origin (default `http://localhost:3000`).

### `SessionController` (`backend/src/session/session.controller.ts`)
| Method | Path | Request body/params | Validation | Success response | Status | Error paths |
|---|---|---|---|---|---|---|
| POST | `/session/create` | `CreateSessionDto { category: string, questionCount: number }` | `category` must be one of `['love','friendship','deep_talk','fun','spicy','fantasy','interests']` (`@IsIn`); `questionCount` must be int `5–20` (`@IsInt @Min(5) @Max(20)`) | `{ sessionId, player1Id, questionIds: number[], shareLink: "/lobby/{id}" }` | `201` (Nest default for POST) | Validation failure → `400` (Nest `ValidationPipe` default). **LLM failure is swallowed internally** (see §6/DRIFT) — the endpoint never surfaces a 5xx for LLM problems; it silently falls back to hardcoded questions and still returns `201` |
| POST | `/session/join` | `JoinSessionDto { sessionId: string }` | `@IsString()` only — **no format/UUID validation, no existence pre-check** | `{ sessionId, player2Id, category, questionCount }` | `201` (2 successful joins would both need distinct calls; see logic below) | `NotFoundException` (`404`) if session doesn't exist; `BadRequestException('Session is already full')` (`400`) if `session.player2Id` is already set. **Race condition**: two near-simultaneous joins on a fresh session can both pass the `if (session.player2Id)` check before either write lands — no transaction/lock guards this update |
| GET | `/session/:id` | `id` path param | none | Raw Prisma `Session` row (includes `player1Id`, `player2Id` — **both players' secret IDs are exposed to any caller who knows the session id**, i.e. anyone with the shareable lobby link can read both players' secret UUIDs) | `200` | `NotFoundException` (`404`) if missing |

### `QuestionController` (`backend/src/question/question.controller.ts`)
| Method | Path | Request | Validation | Success response | Status | Error paths |
|---|---|---|---|---|---|---|
| GET | `/question/:sessionId` | `sessionId` path param | none | `Array<{ id, text, type, options: string[] | null, category }>` — `options` is `JSON.parse`d server-side from the stored string | `200` | `NotFoundException` (`404`) if session missing. **Unhandled**: if a `Question.options` string is corrupted/non-JSON, `JSON.parse` throws unhandled → Nest converts to `500 Internal Server Error` with no custom message |

### `AnswerController` (`backend/src/answer/answer.controller.ts`) — **not documented in `architecture_documentation.md` at all** except the `POST` and `/count` routes; the plain `GET /answer/:sessionId` is undocumented (see DRIFT)
| Method | Path | Request | Validation | Success response | Status | Error paths |
|---|---|---|---|---|---|---|
| POST | `/answer` | `SubmitAnswerDto { sessionId, questionId: int, playerId, answer }` | all fields `@IsString`/`@IsInt`, no length/enum checks on `answer` itself (a text answer of unbounded length is accepted) | Prisma `Answer` row (upserted) | `201` | `BadRequestException('Session not found')` (`400`, not 404 — inconsistent with `SessionController`'s use of `NotFoundException` for the identical condition — see DRIFT); `BadRequestException('Player does not belong to this session')` (`400`) if `playerId` isn't `session.player1Id`/`player2Id`. **No check that `questionId` belongs to `sessionId`** — a caller can submit an answer against a foreign session's question id as long as the FK exists in some `Question` row anywhere in the DB (Prisma FK constraint on `questionId` doesn't exist at all — see schema; only `sessionId` is a real FK) |
| GET | `/answer/:sessionId` | `sessionId` path param | none | All `Answer` rows for the session, ordered by `questionId` | `200` | none — no existence check on the session; returns `[]` silently for a bogus id |
| GET | `/answer/:sessionId/count` | `sessionId` path param | none | `{ player1: number, player2: number, totalExpected: number, bothComplete: boolean }` | `200` | `BadRequestException('Session not found')` (`400`, same 400-vs-404 inconsistency) |

### `ResultController` (`backend/src/result/result.controller.ts`)
| Method | Path | Request | Validation | Success response | Status | Error paths |
|---|---|---|---|---|---|---|
| POST | `/result/generate/:sessionId` | `sessionId` path param | none | `{ score: number, summary: string, strengths: string[], differences: string[] }` — **on success this is the raw LLM-parsed object, NOT re-fetched from DB**, so it can contain extra/missing fields the LLM hallucinated, unlike `getResult` which always returns the exact 4-key shape | `201` | `BadRequestException('Session not found')` (`400`); `BadRequestException('Session is not complete — Player 2 has not joined')` (`400`) if `player2Id` is null. **All LLM/JSON-parse errors are caught internally and converted into a 50–90 random-score fallback result that is saved to the DB and returned with `201`** — this endpoint can never return a 4xx/5xx once past the two `BadRequestException` checks above, even if the AI provider is completely down |
| GET | `/result/:sessionId` | `sessionId` path param | none | `{ score, summary, strengths, differences }` or literal `null` | `200` (`200` with body `null`, not `404`) | none |

### Cross-cutting backend notes
- No controller reads or validates any auth header/cookie/JWT — "player identity" is enforced purely by the client knowing a UUID string it got back from a prior response and stores in `sessionStorage`. Anyone who obtains a `playerId` (e.g., by reading `GET /session/:id`) can submit answers as that player.
- `schema.prisma` declares `provider = "postgresql"` and reads `DATABASE_URL` from env (`.env.example` shows a `postgresql://.../himandher` URL), but `backend/prisma/dev.db` on disk is an actual **SQLite 3** file. This means local/dev runs are not exercising the declared Postgres provider — a discrepancy worth resolving before treating `schema.prisma` as ground truth for a native/backend rewrite (see DRIFT).

---

## 5. SOCKET CONTRACT

Gateway: `backend/src/gateway/quiz.gateway.ts`, a single `@WebSocketGateway` with CORS locked to `FRONTEND_URL`. Client: `frontend/src/lib/useSocket.ts`.

| Event | Direction | Emitted from (exact code) | Payload (exact) | Authoritative side | Listened to by |
|---|---|---|---|---|---|
| `joinRoom` | Client → Server | `useSocket.ts`: `socket.emit('joinRoom', { sessionId, playerId })` inside the `socket.on('connect', ...)` callback | `{ sessionId: string, playerId: string }` | Client (fires once per socket connection) | Server `@SubscribeMessage('joinRoom') handleJoinRoom` → calls `client.join(data.sessionId)`, logs, then re-emits `playerJoined` |
| `playerJoined` | Server → Client (broadcast to room, excluding sender) | `quiz.gateway.ts`: `client.to(data.sessionId).emit('playerJoined', { playerId: data.playerId })` | `{ playerId: string }` | Server | Only `lobby/[sessionId]/page.tsx`: `on('playerJoined', () => api.getSession(sessionId).then(setSession))` — **note it ignores the payload entirely and just re-fetches session state over REST** |
| `submitAnswer` | Client → Server | `useSocket.ts` `emitAnswer(questionId, answerIndex)`: `socket.emit('submitAnswer', { sessionId, playerId, questionId, answerIndex })` | `{ sessionId: string, playerId: string, questionId: number, answerIndex: number }` | Client | Server `@SubscribeMessage('submitAnswer') handleSubmitAnswer` |
| `answerSubmitted` | Server → Client (broadcast, excluding sender) | `quiz.gateway.ts`: `client.to(data.sessionId).emit('answerSubmitted', { playerId, questionId, answerIndex })` | `{ playerId: string, questionId: number, answerIndex: number }` | Server | `quiz/[sessionId]/page.tsx`: `on('answerSubmitted', (...args) => { const data = args[0] as { answerIndex: number }; setOtherPlayerProgress(prev => Math.max(prev, data.answerIndex + 1)) })` — **only reads `answerIndex`; `playerId` and `questionId` are received but unused, so the client cannot tell which question or which player answered, only a monotonic index** |
| `quizComplete` | Client → Server | `useSocket.ts` `emitComplete()`: `socket.emit('quizComplete', { sessionId, playerId })` | `{ sessionId: string, playerId: string }` | Client | Server `@SubscribeMessage('quizComplete') handleQuizComplete` |
| `playerComplete` | Server → Client (broadcast, excluding sender) | `quiz.gateway.ts`: `client.to(data.sessionId).emit('playerComplete', { playerId: data.playerId })` | `{ playerId: string }` | Server | `quiz/[sessionId]/page.tsx`: `on('playerComplete', () => { if (isComplete) router.push(\`/results/${sessionId}\`); else setWaitingForOther(false) })` — payload's `playerId` is **received but unused**; the client infers "it must be the other player" purely from its own local `isComplete` flag |
| `resultsReady` | Server → Client (documented, **never implemented**) | `quiz.gateway.ts` defines a plain method `emitResultsReady(sessionId, results)` that calls `this.server.to(sessionId).emit('resultsReady', results)` — **grepped the entire `backend/src` tree: this method is never called from anywhere**, and `ResultModule` never imports `GatewayModule` or injects `QuizGateway` | Documented in `architecture_documentation.md` as `QuizResult` payload, but there is **no code path that ever invokes it** | N/A — dead code | **No client code listens for `resultsReady` at all** — `results/[sessionId]/page.tsx` doesn't even call `useSocket`. See DRIFT §6 |

**Authority summary:** the server is authoritative for room membership and for broadcasting "something happened," but it never pushes actual state (scores, session status, answers) over the socket — every socket event is a *signal* that tells the client "go re-fetch via REST," except `answerSubmitted`, whose numeric payload the client trusts directly to move a progress bar (with no REST cross-check). The `Session.status` transition to `'active'`/`'completed'` is REST/DB-driven; sockets never carry it.

---

## 6. DRIFT

Ranked by how much it would mislead someone building a native client from the doc alone.

| # | Where the doc says X | Where the code does Y | Impact |
|---|---|---|---|
| 1 | `architecture_documentation.md` §3 "Gateway Events Map" documents `resultsReady` as an outgoing server event carrying the `QuizResult` payload, and §"Phase D" sequence diagram shows the server broadcasting it after AI generation | `QuizGateway.emitResultsReady()` exists but is **never called** anywhere in `backend/src` (confirmed by grep); `ResultModule` doesn't import `GatewayModule`; no client subscribes to `resultsReady` either | A native client written strictly from the doc would wait forever for a socket push that never arrives. Results are **100% REST-driven** in practice: `results/page.tsx` polls `GET /result/:id` then `POST /result/generate/:id` on mount, with zero socket involvement |
| 2 | Doc's §5 API reference table lists only 8 endpoints, omitting `GET /answer/:sessionId` (undocumented) entirely | `AnswerController` has 3 routes: `POST /answer`, `GET /answer/:sessionId`, `GET /answer/:sessionId/count` — the plain `GET /answer/:sessionId` (raw answer dump for a session) exists in code and is never mentioned in the doc | A native backend re-implementation working only from the doc would miss this endpoint; also worth asking whether it's intentionally public (no auth on raw answers) |
| 3 | Doc/PRD's `Session` schema description implies category is one of the 5 listed (`love/friendship/deep_talk/fun/spicy`) | `frontend/src/app/page.tsx` `CATEGORIES` list and `CreateSessionDto`'s `@IsIn([...])` both additionally allow `'fantasy'` and `'interests'` — but `SessionService.generateQuestions`'s `categoryLabels` map and `getFallbackQuestions`'s `defaults` map **only have entries for the original 5**; `fantasy`/`interests` silently fall through to `categoryLabels[category] || category` (raw slug in the LLM prompt) and `defaults[category] || defaults['fun']` (fun-category fallback questions mislabeled as fantasy/interests) | Two categories are reachable in the UI and pass backend validation but produce mismatched/fallback content. Not a crash, but a content-correctness bug that a native rebuild should either fix or preserve deliberately |
| 4 | Doc's connection-setup section shows client transports as `['websocket', 'polling']` (resilience against proxies) | `frontend/src/lib/useSocket.ts` actually configures `io(SOCKET_URL, { transports: ['websocket'] })` — **polling is not in the actual client fallback list** | Any environment where raw WebSocket upgrade is blocked (corporate proxies, some mobile carriers) will fail silently to connect on web today, contrary to the doc's claim of resilience. For native, verify whether the RN socket.io client needs the same fallback re-added |
| 5 | Doc doesn't mention CSS module files at all (reasonably, since they're irrelevant to architecture) but `design.md`'s design-system doc implies these values (`--font-display`, `--radius-full`, `--bg-glass`, `--border-glass`, `--radius-lg`, `--shadow-retro`) are part of the live token system | `lobby.module.css`, `quiz.module.css`, `results.module.css` reference exactly those undefined tokens and are **never imported by any component** (confirmed: zero `.module.css` imports anywhere in `frontend/src`) | If a native design-system rebuild pulls "the CSS" from these module files as source of truth, it will import a parallel, subtly different, and completely inert design language that was never actually rendered on web. Use only `globals.css` + inline Tailwind classes in the 4 page files as ground truth |
| 6 | `tailwind.config.ts` defines `animation.fadeInUp/fadeIn/bounceIn` with specific durations (`0.8s`/`0.6s`/`0.8s`) as "the" animation timing | Every actual call site in the 4 page components uses **arbitrary-value Tailwind syntax** (`animate-[fadeInUp_0.5s_ease_forwards]`, `animate-[fadeIn_0.4s_ease]`, etc.) that **overrides** the config's duration inline, meaning the config's `theme.extend.animation` entries are dead weight, never actually invoked by the class name `animate-fadeInUp` alone anywhere in the codebase (grep confirms no bare `animate-fadeInUp`/`animate-fadeIn`/`animate-bounceIn` usage, only bracketed overrides) | A native rebuild taking "0.8s ease forwards" from the Tailwind config as the timing spec will not match what users actually see on web (0.4–0.6s in most places) |
| 7 | `design.md` explicitly states components "must never use hardcoded color values (like `#ff1493`); they must only reference these roles [CSS variables]" | `results/page.tsx` hardcodes `background: '#ff1493', border: '2px solid #8b0000'` inline on the SHARE IMAGE button (line ~249), and `SoundtrackPlayer.tsx` hardcodes `#ff1493`, `#fff0f5`, `#333`, `#ffd1dc`, raw `black`/`white`/`gray-300` throughout, plus `toBlob`'s `backgroundColor: '#fff0f5'` is a duplicated literal of `--bg-primary` | The stated design-system invariant is already violated on web before any native port; a native theming layer needs to either fix these leaks or treat them as "theme fixed to Love & Romance, cannot actually be swapped," contradicting the doc's "swap a single CSS variable block" promise |
| 8 | `schema.prisma` declares `datasource db { provider = "postgresql" }`, `.env.example` shows a `postgresql://` `DATABASE_URL` | `backend/prisma/dev.db` on disk is a **real SQLite 3 database file** (verified via `file` command: "SQLite 3.x database") | Unclear which is authoritative for current local development — worth confirming directly with whoever runs the backend locally before assuming Postgres-only semantics (e.g., JSON columns, concurrency behavior) carry over to a native/backend rewrite. **UNKNOWN — check `backend/.env` (not `.env.example`, which is git-ignored per `.gitignore`) and whichever `DATABASE_URL` is actually exported when `prisma migrate`/`db push` was last run** |
| 9 | Doc's error-handling narrative doesn't mention specific HTTP status codes | Actual backend is **inconsistent about `400` vs `404`**: `SessionController`/`SessionService` correctly throws `NotFoundException` (404) for a missing session on `join`/`getSession`, but `AnswerService.submit`/`getAnswerCount` and `ResultService.generate` all throw `BadRequestException` (400) for the identical "session not found" condition | A native client can't reliably distinguish "your request was malformed" from "that session doesn't exist" by status code alone across endpoints — must special-case per endpoint or rely on `error.message` string matching (fragile) |
| 10 | Doc's Phase C sequence diagram shows `answerSubmitted`'s payload used to show "Player X answered!" per-question indicators | Actual client handler (`quiz/page.tsx`) only tracks a **numeric max progress index** (`Math.max(prev, data.answerIndex + 1)`) — it cannot render "which specific question" or "which specific player" answered, despite both `playerId` and `questionId` being present in the payload it receives | If a native rebuild wants the doc's described per-question indicator UX, that's new functionality, not a like-for-like port — the current web client silently discards data it needs for that UX |

---

## 7. STATE OWNERSHIP

| Screen | REST-sourced state | Socket-sourced state | `sessionStorage`-sourced state | What happens if the socket drops mid-screen (today's actual behavior) |
|---|---|---|---|---|
| `/` (landing) | None until submit; `POST /session/create` response feeds the redirect | None — `useSocket` is never called on this page | Writes (not reads) `player_${sessionId}` on success | N/A — no socket connection exists on this screen |
| `/lobby/[sessionId]` | `session` (full `Session` row) via `GET /session/:id`, both on mount and again inside the `playerJoined` handler; `playerInfo` refresh after `POST /session/join` | Only signal-level: `playerJoined` (payload ignored, triggers a REST re-fetch) | `playerInfo` (`{ playerId, isHost }`) read on mount via `sessionStorage.getItem`; written on join | If the socket disconnects before P2 joins, P1's browser **never learns P2 joined** — there is no REST polling fallback on this screen, so P1 is stuck on "WAITING FOR P2..." indefinitely even though the DB's `session.status` did flip to `'active'` server-side (a page refresh would fix it, since the mount-time `GET /session/:id` would then observe `status === 'active'` and redirect after 1.5s, but nothing auto-recovers) |
| `/quiz/[sessionId]` | `questions` array via `GET /question/:sessionId` (once, on mount); `answerCount`/`bothComplete` via `GET /answer/:sessionId/count` (once, only after the player's own last answer) | `otherPlayerProgress` (from `answerSubmitted`, numeric only); completion signal from `playerComplete` (drives `waitingForOther`/redirect) | `playerInfo` read on mount (redirects to `/lobby` if absent) | If the socket drops **before** the current player finishes: their own submissions still succeed (`POST /answer` is REST, socket-independent), but they stop seeing the opponent's live progress bar update (`otherPlayerProgress` freezes at its last known value) — no error is shown, it just silently stalls. If the socket drops **after** the current player finishes and is on the "STAGE CLEAR / AWAITING P2" screen: they will **never receive `playerComplete`**, so `waitingForOther` never flips false and there is no REST poll/timeout to recover — the player is stuck on that screen forever unless they manually navigate to `/results/[sessionId]`, which happens to work anyway because that page independently re-derives everything from REST |
| `/results/[sessionId]` | Everything: `GET /result/:sessionId` then `POST /result/generate/:sessionId`, both only on mount | **None** — this screen never calls `useSocket` at all, despite the architecture doc describing a `resultsReady` socket push for this exact phase (dead code per DRIFT §1) | Not read directly (share link is derived from `window.location`, not storage) | Irrelevant — there is no socket connection to drop on this screen in the current implementation |

**Overall pattern:** sockets are used only as best-effort "someone should refresh now" nudges layered on top of state that is always ultimately owned by REST + the Postgres/SQLite-backed session row. Every socket handler in the client either (a) triggers a REST re-fetch, or (b) mutates a purely-local, non-persisted counter (`otherPlayerProgress`) that has no reconciliation against REST truth. **None of the three multiplayer screens implement reconnection, retry, or polling fallback for a dropped socket** — a native rebuild that wants resilience to flaky mobile connections (the whole point of this migration) needs to add: (1) periodic REST polling as a socket-drop fallback on `/lobby` and the "waiting for other player" states of `/quiz`, and (2) a reconciliation fetch after any socket reconnect, since currently a reconnect just silently re-joins the room (`socket.on('connect', ...)` re-emits `joinRoom`) with no "catch me up" event or REST call triggered by reconnection itself.
