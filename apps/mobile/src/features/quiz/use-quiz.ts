import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type {
  Answer,
  AnswerSubmittedPayload,
  SessionStateResponse,
} from '@youandi/shared';

import { useGameSocket } from '@/hooks/useGameSocket';
import {
  useInterceptBack,
  useLeavingIntentionally,
} from '@/hooks/useInterceptBack';
import {
  NetworkError,
  TimeoutError,
  getAnswers,
  getSessionState,
  submitAnswer,
} from '@/lib/api';
import { normalizeQuizError, type QuizError } from '@/lib/quiz-error';

export const MAX_TEXT_LENGTH = 500;

const POLL_INTERVAL_MS = 5000;
const FLUSH_INTERVAL_MS = 3000;

type QueuedAnswer = { questionId: number; answer: string };

export function useQuiz(sessionId: string, playerId: string) {
  const router = useRouter();
  const { leavingIntentionallyRef, markLeaving } = useLeavingIntentionally();
  const [gameState, setGameState] = useState<SessionStateResponse | null>(null);
  const [socketStatus, setSocketStatus] = useState<string>('offline');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<QuizError | null>(null);
  const [questions, setQuestions] = useState<SessionStateResponse['questions']>(
    [],
  );
  const [submittedIds, setSubmittedIds] = useState<Set<number>>(new Set());
  const [partnerSubmittedIds, setPartnerSubmittedIds] = useState<Set<number>>(
    new Set(),
  );
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [rollbackMessage, setRollbackMessage] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const queueRef = useRef<QueuedAnswer[]>([]);
  const flushingRef = useRef(false);
  const navigatingRef = useRef(false);
  const emittedCompleteRef = useRef(false);

  const socket = useGameSocket(sessionId, playerId, {
    onAnswerSubmitted: (payload: AnswerSubmittedPayload) => {
      if (payload.playerId !== playerId) {
        setPartnerSubmittedIds((current) => {
          const next = new Set(current);
          next.add(payload.questionId);
          return next;
        });
      }
    },
  });

  const applyState = useCallback((state: SessionStateResponse) => {
    setGameState(state);
    setQuestions(state.questions);
    setSubmittedIds((current) => {
      const next = new Set(current);
      state.you.answeredQuestionIds.forEach((id) => next.add(id));
      return next;
    });
    setPartnerSubmittedIds((current) => {
      const next = new Set(current);
      state.partner.answeredQuestionIds.forEach((id) => next.add(id));
      return next;
    });
    setIsLoading(state.questions.length === 0);
    setError(null);
  }, []);

  useEffect(() => {
    setSocketStatus(socket.status);
  }, [socket.status]);

  useEffect(() => {
    let mounted = true;
    getSessionState(sessionId, playerId)
      .then(async (state) => {
        if (!mounted) return;
        applyState(state);
        try {
          const storedAnswers = await getAnswers(sessionId);
          if (!mounted) return;
          setAnswers(
            Object.fromEntries(
              storedAnswers
                .filter((answer) => answer.playerId === playerId)
                .map((answer) => [answer.questionId, answer.answer]),
            ),
          );
        } catch {
          // The question state remains usable; answers are rehydrated on finish.
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        setError(normalizeQuizError(err));
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [applyState, playerId, sessionId]);

  useEffect(() => {
    if (socket.state?.session.id === sessionId) applyState(socket.state);
  }, [applyState, sessionId, socket.state]);

  const refresh = socket.refresh;
  useEffect(() => {
    if (!isLoading) return;
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    void refresh();
    return () => clearInterval(id);
  }, [isLoading, refresh]);

  const answeredIds = useMemo(() => new Set(submittedIds), [submittedIds]);
  const currentIndex = useMemo(
    () => questions.findIndex((question) => !answeredIds.has(question.id)),
    [answeredIds, questions],
  );
  const currentQuestion = currentIndex >= 0 ? questions[currentIndex] : null;
  const totalQuestions = questions.length;
  const localComplete = totalQuestions > 0 && currentIndex < 0;
  const partnerProgress = partnerSubmittedIds.size;
  const confirmedComplete =
    gameState?.you.answeredQuestionIds.length === totalQuestions &&
    totalQuestions > 0;

  useEffect(() => {
    if (confirmedComplete && !emittedCompleteRef.current) {
      emittedCompleteRef.current = true;
      socket.emitComplete();
    }
  }, [confirmedComplete, socket]);

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
    markLeaving,
    router,
    sessionId,
  ]);

  const postAnswer = useCallback(
    async (item: QueuedAnswer, index: number) => {
      try {
        await submitAnswer(
          { sessionId, questionId: item.questionId, answer: item.answer },
          playerId,
        );
        socket.emitAnswer(item.questionId, index);
        queueRef.current = queueRef.current.filter(
          (queued) => queued.questionId !== item.questionId,
        );
        setPendingCount(queueRef.current.length);
        setRollbackMessage(null);
      } catch (err) {
        if (err instanceof NetworkError || err instanceof TimeoutError) {
          if (
            !queueRef.current.some(
              (queued) => queued.questionId === item.questionId,
            )
          ) {
            queueRef.current.push(item);
            setPendingCount(queueRef.current.length);
          }
          return;
        }

        setSubmittedIds((current) => {
          const next = new Set(current);
          next.delete(item.questionId);
          return next;
        });
        setAnswers((current) => {
          const next = { ...current };
          delete next[item.questionId];
          return next;
        });
        setRollbackMessage('That answer could not be saved. Try again.');
      }
      try {
        await refresh();
      } catch {
        // The answer is already persisted; the next reconnect rehydrates it.
      }
    },
    [playerId, refresh, sessionId, socket],
  );

  const flushQueue = useCallback(async () => {
    if (flushingRef.current || queueRef.current.length === 0) return;
    flushingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current[0];
        const index = questions.findIndex(
          (question) => question.id === item.questionId,
        );
        try {
          await submitAnswer(
            { sessionId, questionId: item.questionId, answer: item.answer },
            playerId,
          );
          socket.emitAnswer(item.questionId, index);
          queueRef.current.shift();
          setPendingCount(queueRef.current.length);
        } catch (err) {
          if (err instanceof NetworkError || err instanceof TimeoutError) break;
          queueRef.current.shift();
          setPendingCount(queueRef.current.length);
          setSubmittedIds((current) => {
            const next = new Set(current);
            next.delete(item.questionId);
            return next;
          });
          setRollbackMessage(
            'An offline answer could not be saved. Try again.',
          );
        }
      }
      await refresh();
    } finally {
      flushingRef.current = false;
    }
  }, [playerId, questions, refresh, sessionId, socket]);

  useEffect(() => {
    if (socket.status === 'connected') void flushQueue();
  }, [flushQueue, socket.status]);

  useEffect(() => {
    if (queueRef.current.length === 0) return;
    const id = setInterval(() => void flushQueue(), FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [flushQueue, submittedIds]);

  const commitAnswer = useCallback(
    (answer: string) => {
      if (!currentQuestion || !answer) return;
      setIsPosting(true);
      setRollbackMessage(null);
      setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }));
      setSubmittedIds((current) => new Set(current).add(currentQuestion.id));
      setSelectedOption(null);
      setTextAnswer('');
      void postAnswer(
        { questionId: currentQuestion.id, answer },
        currentIndex,
      ).finally(() => setIsPosting(false));
    },
    [currentIndex, currentQuestion, postAnswer],
  );

  const handleSelectOption = useCallback(
    (option: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedOption(option);
      commitAnswer(option);
    },
    [commitAnswer],
  );

  const handleTextChange = useCallback((value: string) => {
    if (value.length <= MAX_TEXT_LENGTH) setTextAnswer(value);
  }, []);

  const submitCurrent = useCallback(() => {
    commitAnswer(textAnswer.trim());
  }, [commitAnswer, textAnswer]);

  const handleRetry = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      applyState(await getSessionState(sessionId, playerId));
    } catch (err) {
      setError(normalizeQuizError(err));
      setIsLoading(false);
    }
  }, [applyState, playerId, sessionId]);

  useInterceptBack(
    useCallback(
      ({ preventDefault }) => {
        if (leavingIntentionallyRef.current) return;
        preventDefault();
        Alert.alert(
          'Leave quiz?',
          'Someone is waiting on the other side of this session.',
          [
            { text: 'STAY', style: 'cancel' },
            {
              text: 'LEAVE',
              style: 'destructive',
              onPress: () => {
                markLeaving();
                router.replace('/');
              },
            },
          ],
        );
      },
      [leavingIntentionallyRef, markLeaving, router],
    ),
  );

  const ownAnswers: Answer[] = Object.entries(answers).map(
    ([questionId, answer], index) => ({
      id: index,
      sessionId,
      questionId: Number(questionId),
      playerId,
      answer,
    }),
  );

  return {
    isLoading,
    error,
    currentQuestion,
    currentIndex,
    totalQuestions,
    youProgress: answeredIds.size,
    partnerProgress,
    localComplete,
    pendingCount,
    socketStatus,
    selectedOption,
    textAnswer,
    isSubmitting: isPosting,
    rollbackMessage,
    ownAnswers,
    questions,
    handleSelectOption,
    handleTextChange,
    submitCurrent,
    handleRetry,
  };
}
