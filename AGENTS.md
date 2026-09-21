# You & I — agent working notes

## What this repo is
A two-player AI compatibility game. Players join a session by link, answer
AI-generated questions in a category, and get a compatibility result.
Today: Next.js web + NestJS API + Postgres/Prisma.
Being migrated to: an Expo (React Native) app on the same NestJS API.

## Layout
- apps/api          NestJS + Prisma. Authoritative for all game state.
- apps/mobile       Expo app, Expo Router. This is the product now.
- apps/web          Next.js. Kept only as the share-link landing page.
- packages/shared   Types, zod schemas, socket event contracts. Imported by all three.

## Hard rules
- The server is authoritative. Sockets are a hint that something changed, never the
  sole cause of a state transition. Every socket-driven UI change must also be
  derivable from a REST call.
- Mobile apps get backgrounded and lose their socket. Every screen must survive
  disconnect, reconnect and rehydrate without the user having to do anything.
- No `any`. Shared types live in packages/shared, are imported, and are never
  re-declared locally.
- Player IDs are bearer secrets. expo-secure-store only. Never AsyncStorage,
  never a log line, never a URL query param.
- No new dependency without stating why in the summary, and confirming it supports
  the React Native New Architecture.
- Never edit apps/mobile/android or apps/mobile/ios. They are generated output.
  Native config goes in app.config.ts.
- Motion may animate transform and opacity only. Never animate width, height,
  margin, padding, or flex; those force a native layout pass per frame.
- Animations must not read or write React state per frame. Use Reanimated shared
  values and animated styles on the UI thread.
- Every motion preset must check `AccessibilityInfo.isReduceMotionEnabled()` and
  degrade to an instant final state when reduced motion is enabled.

## Style
- TypeScript strict everywhere. Function components and hooks only.
- NativeWind for styling in apps/mobile. Reach for StyleSheet only when NativeWind
  genuinely cannot express it, e.g. values driven by Reanimated at runtime.
- Files under ~200 lines. Split by feature, not by file type.

## Before you finish any task
- Run `pnpm typecheck` at the repo root and fix everything it reports.
- For mobile changes also run `npx expo-doctor` inside apps/mobile.
- Summarise the change in at most five bullets, and separately list anything you
  deliberately left undone or faked.