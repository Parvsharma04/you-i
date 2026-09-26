import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

import { categorySchema, playerRoleSchema } from '@youandi/shared';

const ACTIVE_SESSION_KEY = 'activeSessionId';
const SESSION_INDEX_KEY = 'sessionIndex';
const DEVICE_ID_KEY = 'deviceId';

async function guardAvailable(): Promise<void> {
  const available = await SecureStore.isAvailableAsync();
  if (!available) {
    throw new Error(
      'expo-secure-store is not available. Rebuild your development client (or run on iOS/Android, not web).',
    );
  }
}

export type PlayerRole = z.infer<typeof playerRoleSchema>;

export const sessionRecordSchema = z.object({
  sessionId: z.string(),
  playerId: z.string(),
  role: playerRoleSchema,
  category: categorySchema,
  questionCount: z.number().int(),
  roomCode: z.string().optional(),
  savedAt: z.string().datetime(),
  passAndPlay: z.boolean().optional(),
  player1Id: z.string().optional(),
  player2Id: z.string().optional(),
  player1Name: z.string().optional(),
  player2Name: z.string().optional(),
});
export type SessionRecord = z.infer<typeof sessionRecordSchema>;

function sessionKey(sessionId: string): string {
  return `session_${sessionId}`;
}

async function readIndex(): Promise<string[]> {
  await guardAvailable();
  const raw = await SecureStore.getItemAsync(SESSION_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return z.array(z.string()).parse(parsed);
  } catch {
    return [];
  }
}

async function writeIndex(index: string[]): Promise<void> {
  await guardAvailable();
  await SecureStore.setItemAsync(SESSION_INDEX_KEY, JSON.stringify(index));
}

export async function saveSession(record: SessionRecord): Promise<void> {
  await guardAvailable();
  const validated = sessionRecordSchema.parse(record);
  await SecureStore.setItemAsync(
    sessionKey(validated.sessionId),
    JSON.stringify(validated),
  );
  await SecureStore.setItemAsync(ACTIVE_SESSION_KEY, validated.sessionId);

  const index = await readIndex();
  if (!index.includes(validated.sessionId)) {
    index.push(validated.sessionId);
    await writeIndex(index);
  }
}

export async function getSession(
  sessionId: string,
): Promise<SessionRecord | null> {
  await guardAvailable();
  const raw = await SecureStore.getItemAsync(sessionKey(sessionId));
  if (!raw) return null;

  try {
    return sessionRecordSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function getActiveSession(): Promise<SessionRecord | null> {
  await guardAvailable();
  const activeId = await SecureStore.getItemAsync(ACTIVE_SESSION_KEY);
  if (!activeId) return null;
  return getSession(activeId);
}

export async function clearSession(sessionId: string): Promise<void> {
  await guardAvailable();
  await SecureStore.deleteItemAsync(sessionKey(sessionId));

  const activeId = await SecureStore.getItemAsync(ACTIVE_SESSION_KEY);
  if (activeId === sessionId) {
    await SecureStore.deleteItemAsync(ACTIVE_SESSION_KEY);
  }

  const index = await readIndex();
  const nextIndex = index.filter((id) => id !== sessionId);
  if (nextIndex.length !== index.length) {
    await writeIndex(nextIndex);
  }
}

export async function clearAll(): Promise<void> {
  await guardAvailable();
  const index = await readIndex();
  await Promise.all([
    SecureStore.deleteItemAsync(ACTIVE_SESSION_KEY),
    SecureStore.deleteItemAsync(SESSION_INDEX_KEY),
    ...index.map((id) => SecureStore.deleteItemAsync(sessionKey(id))),
  ]);
}

export async function getOrCreateDeviceId(): Promise<string> {
  await guardAvailable();
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const bytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  );
  const id = bytes.join('');
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  return id;
}
