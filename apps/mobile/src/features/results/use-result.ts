import { useCallback, useEffect, useRef, useState } from 'react';

import { useGameSocket } from '@/hooks/useGameSocket';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  generateResult,
  getResult,
} from '@/lib/api';
import type { Result } from '@youandi/shared';

/**
 * Guards against duplicate automatic generation calls across remounts,
 * reconnects, or both players arriving on the results screen.
 *
 * A deliberate user retry can still clear this guard and re-request.
 */
const requestedGeneration = new Set<string>();

type ResultStatus = 'loading' | 'generating' | 'ready' | 'timeout' | 'error';

export type UseResultReturn = {
  result: Result | null;
  status: ResultStatus;
  error: string | null;
  retry: () => void;
};

const POLL_FAST_MS = 3_000;
const POLL_SLOW_MS = 10_000;
const BACKOFF_AFTER_MS = 30_000;
const GIVE_UP_AFTER_MS = 90_000;

function normalizeError(err: unknown): string {
  if (err instanceof NetworkError || err instanceof TimeoutError) {
    return "You're offline. Results will load when you reconnect.";
  }
  if (err instanceof ApiError) {
    return err.message;
  }
  return 'Could not load results.';
}

export function useResult(
  sessionId: string,
  playerId: string,
): UseResultReturn {
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<ResultStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const resultRef = useRef<Result | null>(null);
  const statusRef = useRef<ResultStatus>('loading');
  const resolveRef = useRef<(data: Result) => void>(() => {});
  const retryingRef = useRef(false);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useGameSocket(sessionId, playerId, {
    onResultsReady: (payload) => resolveRef.current(payload),
  });

  useEffect(() => {
    let mounted = true;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;
    let startedAt: number | null = null;

    const stopPolling = () => {
      if (pollTimeout) {
        clearTimeout(pollTimeout);
        pollTimeout = null;
      }
    };

    const handleReady = (data: Result) => {
      stopPolling();
      requestedGeneration.delete(sessionId);
      if (!mounted || resultRef.current) return;
      setResult(data);
      setStatus('ready');
      setError(null);
    };

    resolveRef.current = handleReady;

    const scheduleNext = () => {
      if (!mounted) return;
      const elapsed = startedAt === null ? 0 : Date.now() - startedAt;
      if (elapsed >= GIVE_UP_AFTER_MS) {
        setStatus('timeout');
        return;
      }
      const delay = elapsed < BACKOFF_AFTER_MS ? POLL_FAST_MS : POLL_SLOW_MS;
      pollTimeout = setTimeout(tick, delay);
    };

    async function tick() {
      if (!mounted) return;

      try {
        const response = await getResult(sessionId, playerId);

        if (response.status === 'ready' && response.data) {
          handleReady(response.data);
          return;
        }

        if (response.status === 'pending') {
          if (statusRef.current !== 'ready') {
            setStatus('generating');
            setError(null);
          }
          if (startedAt === null) startedAt = Date.now();
          scheduleNext();
          return;
        }

        // status === 'none' — kick off generation once, then poll like pending.
        // `retryingRef` lets a deliberate retry bypass the module-level guard
        // without weakening the guard for remounts/reconnects.
        if (!requestedGeneration.has(sessionId) || retryingRef.current) {
          requestedGeneration.add(sessionId);
          retryingRef.current = false;
          const generated = await generateResult(sessionId, playerId);
          if (generated.status === 'ready' && generated.data) {
            handleReady(generated.data);
            return;
          }
        }

        if (statusRef.current !== 'ready') {
          setStatus('generating');
          setError(null);
        }
        if (startedAt === null) startedAt = Date.now();
        scheduleNext();
      } catch (err) {
        if (!mounted) return;
        setError(normalizeError(err));
        setStatus('error');
      }
    }

    tick();

    return () => {
      mounted = false;
      stopPolling();
    };
  }, [sessionId, playerId, retryNonce]);

  const retry = useCallback(() => {
    if (resultRef.current) return;
    retryingRef.current = true;
    setError(null);
    setStatus('loading');
    setRetryNonce((n) => n + 1);
  }, []);

  return { result, status, error, retry };
}
