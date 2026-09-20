# Deploying apps/api

apps/api is a NestJS + Socket.IO server, authoritative for all game state,
built and shipped via `apps/api/Dockerfile` (a multi-stage, pnpm-workspace-aware
build — see that file's comments for how `@youandi/shared` and Prisma are
handled). These instructions target **Render**, chosen because its
[Pre-Deploy Command](https://render.com/changelog/predeploy-command) feature
maps directly onto "run `prisma migrate deploy` once per deploy, before new
instances take traffic" — exactly what we want, without baking migrations
into the image or racing them across replicas on every boot. Railway and
Fly both work too (see the note at the end), but neither has a first-class
equivalent of this pre-deploy phase today.

## 0. Before anything else: HTTPS is mandatory

**Android blocks cleartext (plain `http://`) traffic by default.** The Expo
app will fail to connect — both its REST calls and its Socket.IO
connection — to any API origin that isn't served over HTTPS with a valid
(non-self-signed) certificate. Render, Railway, and Fly all terminate TLS
for you automatically on their default `*.onrender.com` / `*.up.railway.app`
/ `*.fly.dev` domains — you get this for free as long as you deploy to one
of those platforms and don't try to bypass it. If you later put a custom
domain in front, make sure that domain also has a valid cert (Let's Encrypt
via the platform's built-in custom-domain flow is fine) before pointing the
mobile app at it. Do **not** add network security config exceptions to
allow cleartext on Android as a workaround — fix the certificate instead.

## 1. One-time setup

1. Push this repo to GitHub (Render deploys from a git repo or a container
   registry).
2. In the Render dashboard: **New > Web Service**.
3. **Source**: connect the repo. **Runtime**: `Docker`.
4. **Dockerfile Path**: `apps/api/Dockerfile`.
5. **Docker Build Context Directory**: `.` (the monorepo root — the
   Dockerfile's `COPY` instructions assume this; see its header comment).
6. **Region**: pick one close to your Postgres instance.
7. **Instance Type**: the smallest paid tier is fine to start; the free
   tier works too but spins down on idle, which will drop every open
   socket, so don't use it once real players are testing multiplayer.

## 2. Add a managed Postgres instance

1. **New > PostgreSQL** in Render (or bring your own — Neon, Supabase,
   RDS, etc. all work, since the app only needs a standard
   `DATABASE_URL`).
2. Copy the **Internal Connection String** if the DB is also on Render (no
   egress fees, lower latency) — otherwise use the external one.
3. `sslmode=require` is on by default for Render Postgres; if you use a
   different provider double check your `DATABASE_URL` includes it.

## 3. Environment variables

Set these under the web service's **Environment** tab. The app validates
all of them at startup (`apps/api/src/config/env.validation.ts`) and will
**refuse to boot with a clear, itemized error** if a required one is
missing or malformed — you'll see this immediately in the deploy logs
instead of discovering it on the first request.

| Variable                      | Required? | Default          | Notes |
|--------------------------------|-----------|------------------|-------|
| `DATABASE_URL`                 | **Yes**   | —                | Postgres connection string from step 2. |
| `GEMINI_API_KEY`                | **Yes, if `LLM_PROVIDER=gemini`** (the default) | — | From Google AI Studio. |
| `GROQ_API_KEY`                  | **Yes, if `LLM_PROVIDER=groq`** | — | From console.groq.com. |
| `LLM_PROVIDER`                  | No        | `gemini`         | `gemini` or `groq`. |
| `PORT`                          | No        | `8081`           | Render sets its own `PORT` automatically for Docker web services — leave this unset and let the platform inject it; the Dockerfile's `EXPOSE 8081` is just documentation, not a hard binding. |
| `HOST`                          | No        | `0.0.0.0`        | Interface the HTTP server binds to. `0.0.0.0` is required for LAN access from mobile clients; platforms like Render ignore this and bind to their assigned interface. |
| `ALLOWED_ORIGINS`               | No        | `http://localhost:3000` | Comma-separated list of browser origins allowed by CORS (HTTP + Socket.IO). Set this to your apps/web share-link domain, e.g. `https://youandi.app`. Mobile clients send no `Origin` header and are unaffected. |
| `FRONTEND_URL`                  | No        | —                | Legacy single-origin fallback if `ALLOWED_ORIGINS` isn't set. |
| `ALLOW_LEGACY_PLAYER_ID_BODY`   | No        | `true`           | Set to `false` once every client sends `X-Player-Id` instead of a body `playerId`. |
| `NODE_ENV`                      | No        | `development`    | Set to `production` (Render sets this by default for most runtimes, but for Docker services you should set it explicitly). |

## 4. Wire up the release step (migrations)

In the service's **Settings > Pre-Deploy Command**, set:

```
npx prisma migrate deploy --schema=prisma/schema.prisma
```

This runs once per deploy, using the freshly built image, **before** any
new instance starts serving traffic — not in `docker build` (no DB access
at build time) and not in the container's `CMD` (which would re-run, or
race across replicas, on every boot/scale event). If it fails, Render
stops the deploy and keeps the previous version live.

## 5. Deploy and confirm

1. Trigger a deploy (push to the connected branch, or **Manual Deploy** in
   the dashboard).
2. Watch the **Logs** tab. On a cold start you should see the Nest
   bootstrap log ending in:
   ```
   🚀 you&i backend running on http://localhost:<port>
   ```
   If an env var is missing you'll instead see `❌ Invalid or missing
   environment variables:` with the exact key(s) — fix and redeploy.
3. Health check: `curl https://<your-service>.onrender.com/health` should
   return `{"status":"ok","database":"up"}`.

## 6. Confirm WebSocket upgrades are actually happening (not falling back to polling)

Socket.IO transparently falls back to HTTP long-polling if a real
WebSocket upgrade fails, which *works* but is slower and easy to miss.
Confirm the upgrade is really happening end-to-end through Render's proxy:

**From a terminal**, using a raw WebSocket client (`wscat`, or the
one-liner below with Node's `ws` package) against the deployed HTTPS URL:

```bash
npx -y wscat -c "wss://<your-service>.onrender.com/socket.io/?EIO=4&transport=websocket"
```

A successful upgrade prints a `Connected` line and then the Engine.IO
handshake payload (`0{"sid":"...","upgrades":[]...}`) — if instead you get
an HTTP error or the connection just hangs, the proxy isn't passing the
upgrade through.

**From the mobile app / a browser**, open the platform's request
inspector (React Native debugger network tab, or a browser's DevTools
Network tab pointed at the share-link page) and look at the request to
`/socket.io/...`:
- **Upgraded correctly**: one request with `Connection: Upgrade`,
  `Upgrade: websocket`, and a `101 Switching Protocols` response, after
  which no further `/socket.io/?...transport=polling` requests appear.
- **Silently degraded to polling**: repeated short-lived GET/POST requests
  to `/socket.io/?EIO=4&transport=polling` every ~20s, with no `101`
  anywhere. If you see this, check that nothing in front of the app
  (another proxy, a CDN, an aggressive corporate firewall) is stripping
  the `Upgrade`/`Connection` headers — Render's own edge proxy supports
  WebSockets on every plan, so this usually means something upstream of
  Render is the culprit, not Render itself.

**From the server side**, watch the deploy logs while a client connects —
you should see `Client connected: <socket id>` (from `QuizGateway`) fire
immediately on connect, with no delay or retry noise.

## Notes for Railway / Fly instead

- Both support Docker images and WebSockets on their default domains with
  automatic HTTPS — step 0 applies identically.
- Neither has a distinct "pre-deploy" phase today. The safe pattern is a
  **separate one-off command run against the same image**, before
  promoting: e.g. `railway run --service api -- npx prisma migrate deploy`
  (Railway CLI), or `fly ssh console -C "npx prisma migrate deploy"` /
  a dedicated Fly Machine run once per deploy. Do **not** put `prisma
  migrate deploy` in the container's `CMD` on either platform if you run
  more than one instance — concurrent `migrate deploy` runs are
  Prisma-safe (it uses an advisory lock), but it's still cleaner to run it
  exactly once, deliberately, as its own step.
