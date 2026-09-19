import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { ApiError, deleteSession, regenerateCode } from '@/lib/api';
import { env } from '@/lib/env';
import {
  clearSession,
  getSession as getStoredSession,
  saveSession,
} from '@/lib/storage';

import { type LobbyError } from './use-lobby-state';

type LobbyStatus = 'loading' | 'host' | 'waiting' | 'error' | 'needsCode';

export function useLobbyActions(
  sessionId: string | undefined,
  roomCode: string | null,
  setRoomCode: (code: string) => void,
  setCodeExpiresAt: (expiresAt: string) => void,
  setStatus: (status: LobbyStatus) => void,
  setLobbyError: (error: LobbyError | null) => void,
) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCopyCode = useCallback(async () => {
    if (!roomCode) return;
    await Clipboard.setStringAsync(roomCode);
    void Haptics.selectionAsync();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [roomCode]);

  const handleShare = useCallback(async () => {
    if (!roomCode) return;
    const link = `${env.webUrl}/j/${roomCode}`;
    await Share.share({
      message: `Join my game: ${roomCode}\n${link}`,
    });
  }, [roomCode]);

  const handleRegenerate = useCallback(async () => {
    if (!sessionId || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const { code, expiresAt } = await regenerateCode(sessionId);
      const stored = await getStoredSession(sessionId);
      if (stored) {
        await saveSession({ ...stored, roomCode: code });
      }
      setRoomCode(code);
      setCodeExpiresAt(expiresAt);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not regenerate code.';
      setLobbyError({
        kind: 'unknown',
        message,
        actionLabel: 'RETRY',
      });
      setStatus('error');
    } finally {
      setIsRegenerating(false);
    }
  }, [
    sessionId,
    isRegenerating,
    setRoomCode,
    setCodeExpiresAt,
    setStatus,
    setLobbyError,
  ]);

  const handleCancel = useCallback(async () => {
    if (!sessionId || isCancelling) return;
    setIsCancelling(true);
    try {
      await deleteSession(sessionId);
      await clearSession(sessionId);
      router.replace('/');
    } catch (err) {
      setIsCancelling(false);
      const message =
        err instanceof ApiError ? err.message : 'Could not cancel lobby.';
      setLobbyError({
        kind: 'unknown',
        message,
        actionLabel: 'RETRY',
      });
      setStatus('error');
    }
  }, [sessionId, isCancelling, router, setStatus, setLobbyError]);

  return {
    copied,
    isRegenerating,
    isCancelling,
    handleCopyCode,
    handleShare,
    handleRegenerate,
    handleCancel,
  };
}
