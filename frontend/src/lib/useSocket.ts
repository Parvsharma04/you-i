'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSocket(sessionId: string | null, playerId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!sessionId || !playerId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('joinRoom', { sessionId, playerId });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, playerId]);

  const emitAnswer = useCallback(
    (questionId: number, answerIndex: number) => {
      if (socketRef.current && sessionId && playerId) {
        socketRef.current.emit('submitAnswer', {
          sessionId,
          playerId,
          questionId,
          answerIndex,
        });
      }
    },
    [sessionId, playerId],
  );

  const emitComplete = useCallback(() => {
    if (socketRef.current && sessionId && playerId) {
      socketRef.current.emit('quizComplete', { sessionId, playerId });
    }
  }, [sessionId, playerId]);

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  return { emitAnswer, emitComplete, on, socket: socketRef };
}
