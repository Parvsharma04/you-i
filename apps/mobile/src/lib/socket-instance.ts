import { io, Socket } from 'socket.io-client';

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@youandi/shared';

import { env } from './env';

/**
 * Single module-level Socket.IO client. `autoConnect: false` keeps us in
 * control: we only connect when the app is foregrounded and a player has
 * an active session.
 */
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  env.wsUrl,
  {
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
    randomizationFactor: 0.5,
    timeout: 10_000,
    autoConnect: false,
  },
);
