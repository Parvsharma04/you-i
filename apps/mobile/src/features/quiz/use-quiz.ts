import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { SessionStateResponse } from '@youandi/shared';

import { useGameSocket } from '@/hooks/useGameSocket';
import {
  useInterceptBack,
  useLeavingIntentionally,
} from '@/hooks/useInterceptBack';
import {
  NetworkError,
  TimeoutError,
  getSessionState,
  submitAnswer,
} from '@/lib/api';
import { normalizeQuizError, type QuizError } from '@/lib/quiz-error';

export const MAX_TEXT_LENGTH = 500;

const POLL_INTERVAL_MS = 5000;
const FLUSH_INTERVAL_MS = 3000;

export function useQuiz(sessionId: string, playerId: string) {
  const router = useRouter();
  const { leavingIntentionallyRef, markLeaving } = useLeavingIntentionally();
  const {
    state: gameState,
    status: socketStatus,
    refresh,
    emitAnswer,
    emitComplete,
  } = useGameSocket(sessionId, playerId);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<QuizError | null>(null);
  const [questions, setQuestions] = useState<SessionStateResponse['questions']>(
    [],
  );
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [submittedIds, setSubmittedIds] = useState<Set<number>>(new Set());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigatingRef = useRef(false);
  const emittedCompleteRef = useRef(false);
  const flushingRef = useRef(false);
  const offlineQueueRef = useRef<Array<{ questionId: number; answer: string }>>(
    [],
  );

  // Load the authoritative state on mount.
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const state = await getSessionState(sessionId, playerId);
        if (!mounted) return;

        setQuestions(state.questions);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(normalizeQuizError(err));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [sessionId, playerId]);

  // Flush queued answers in order whenever the network/socket recovers.
  const flushQueue = useCallback(async () => {
    if (flushingRef.current || offlineQueueRef.current.length === 0) return;
    flushingRef.current = true;

    try {
      const queue = offlineQueueRef.current;

      for (let i = 0; i < queue.length;) {
        const item = queue[i];
        try {
          await submitAnswer(
            { sessionId, questionId: item.questionId, answer: item.answer },
            playerId,
          );

          const idx = questions.findIndex((q) => q.id === item.questionId);
          emitAnswer(item.questionId, idx >= 0 ? idx : 0);

          queue.splice(i, 1);
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.questionId);
            return next;
          });
          setSubmittedIds((prev) => new Set(prev).add(item.questionId));
        } catch (err) {
          if (err instanceof NetworkError || err instanceof TimeoutError) {
            break;
          }
          // Server rejected this answer; drop it so it doesn't block the queue.
          queue.splice(i, 1);
          setPendingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.questionId);
            return next;
          });
        }
      }

      await refresh();
    } finally {
      flushingRef.current = false;
    }
  }, [sessionId, playerId, questions, emitAnswer, refresh]);

  useEffect(() => {
    if (socketStatus === 'connected' && pendingIds.size > 0) {
      void flushQueue();
    }
  }, [socketStatus, pendingIds.size, flushQueue]);

  useEffect(() => {
    if (pendingIds.size === 0) return;
    const id = setInterval(() => void flushQueue(), FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pendingIds.size, flushQueue]);

  // Prune optimistic submitted ids once the server state confirms them.
  useEffect(() => {
    if (!gameState) return;
    setSubmittedIds((prev) => {
      const next = new Set(prev);
      for (const id of gameState.you.answeredQuestionIds) {
        next.delete(id);
      }
      return next;
    });
  }, [gameState, gameState?.you.answeredQuestionIds]);

  const answeredIds = useMemo(
    () =>
      new Set([
        ...(gameState?.you.answeredQuestionIds ?? []),
        ...pendingIds,
        ...submittedIds,
      ]),
    [gameState, pendingIds, submittedIds],
  );

  const currentIndex = useMemo(
    () => questions.findIndex((q) => !answeredIds.has(q.id)),
    [questions, answeredIds],
  );

  const currentQuestion = currentIndex >= 0 ? questions[currentIndex] : null;

  const totalQuestions = questions.length;
  const youProgress = answeredIds.size;
  const partnerProgress = gameState?.partner.answeredQuestionIds.length ?? 0;
  const localComplete =
    totalQuestions > 0 && answeredIds.size >= totalQuestions;
  const confirmedComplete = gameState
    ? gameState.you.answeredQuestionIds.length >= totalQuestions
    : false;

  // Tell the server (and partner) once our answers are persisted.
  useEffect(() => {
    if (confirmedComplete && !emittedCompleteRef.current) {
      emittedCompleteRef.current = true;
      emitComplete();
    }
  }, [confirmedComplete, emitComplete]);

  // Both players finished: go to results.
  useEffect(() => {
    if (
      confirmedComplete &&
      gameState?.partner.complete &&
      !navigatingRef.current
    ) {
      navigatingRef.current = true;
      markLeaving();
      router.replace(`/results/${sessionId}`);
    }
  }, [
    confirmedComplete,
    gameState?.partner.complete,
    router,
    sessionId,
    markLeaving,
  ]);

  // Polling fallback for the waiting state or when the socket is offline.
  useEffect(() => {
    if (!localComplete && socketStatus !== 'offline') return;

    const tick = async () => {
      try {
        await refresh();
      } catch {
        // Ignore; the next poll will retry.
      }
    };

    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [localComplete, socketStatus, refresh]);

  const handleSelectOption = useCallback((option: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption((prev) => (prev === option ? null : option));
  }, []);

  const handleTextChange = useCallback((value: string) => {
    if (value.length <= MAX_TEXT_LENGTH) {
      setTextAnswer(value);
    }
  }, []);

  const submitCurrent = useCallback(async () => {
    if (!currentQuestion || isSubmitting) return;

    const answer =
      currentQuestion.type === 'mcq' ? selectedOption : textAnswer.trim();
    if (!answer) return;

    setIsSubmitting(true);
    try {
      await submitAnswer(
        { sessionId, questionId: currentQuestion.id, answer },
        playerId,
      );

      emitAnswer(currentQuestion.id, currentIndex);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(currentQuestion.id);
        return next;
      });
      setSubmittedIds((prev) => new Set(prev).add(currentQuestion.id));
      setSelectedOption(null);
      setTextAnswer('');
    } catch (err) {
      if (err instanceof NetworkError || err instanceof TimeoutError) {
        offlineQueueRef.current.push({
          questionId: currentQuestion.id,
          answer,
        });
        setPendingIds((prev) => new Set(prev).add(currentQuestion.id));
        setSelectedOption(null);
        setTextAnswer('');
      } else {
        setError(normalizeQuizError(err));
      }
    } finally {
      setIsSubmitting(false);
    }

    // Rehydrate outside the submit try/catch so a refresh failure doesn't
    // re-queue an answer that already reached the server.
    try {
      await refresh();
    } catch {
      // Ignore; the next reconnect/poll will catch up.
    }
  }, [
    currentQuestion,
    isSubmitting,
    selectedOption,
    textAnswer,
    sessionId,
    playerId,
    currentIndex,
    emitAnswer,
    refresh,
  ]);

  const handleRetry = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const state = await getSessionState(sessionId, playerId);
      setQuestions(state.questions);
    } catch (err) {
      setError(normalizeQuizError(err));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, playerId]);

  // Hardware back / gesture back must confirm instead of abandoning the game.
  // We use Expo Router's `useNavigation` + `beforeRemove` rather than
  // `BackHandler` directly.
  useInterceptBack(
    useCallback(
      ({ preventDefault }) => {
        if (leavingIntentionallyRef.current) return;
        preventDefault();
        Alert.alert(
          'Leave game?',
          'Your partner is waiting on the other side.',
          [
            { text: 'STAY', style: 'cancel' },
            {
              text: 'LEAVE',
              style: 'destructive',
              onPress: () => router.replace('/'),
            },
          ],
        );
      },
      [leavingIntentionallyRef, router],
    ),
  );

  return {
    isLoading,
    error,
    currentQuestion,
    currentIndex,
    totalQuestions,
    youProgress,
    partnerProgress,
    localComplete,
    pendingCount: pendingIds.size,
    socketStatus,
    selectedOption,
    textAnswer,
    isSubmitting,
    handleSelectOption,
    handleTextChange,
    submitCurrent,
    handleRetry,
  };
}
