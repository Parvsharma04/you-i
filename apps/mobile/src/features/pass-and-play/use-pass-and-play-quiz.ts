import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import type { PlayerRole, SessionStateResponse } from '@youandi/shared';

import { MAX_TEXT_LENGTH } from '@/features/quiz/use-quiz';
import { getSessionState, submitAnswer } from '@/lib/api';
import { normalizeQuizError, type QuizError } from '@/lib/quiz-error';
import { saveSession, type SessionRecord } from '@/lib/storage';

export { MAX_TEXT_LENGTH };

type Phase = 'loading' | 'quiz' | 'handoff' | 'results';

type Question = SessionStateResponse['questions'][number];

function playerIdForRole(record: SessionRecord, role: PlayerRole): string {
  return role === 'player1'
    ? (record.player1Id ?? record.playerId)
    : (record.player2Id ?? record.playerId);
}

export function usePassAndPlayQuiz(
  sessionId: string,
  record: SessionRecord,
  markLeaving: () => void,
) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [currentRole, setCurrentRole] = useState<PlayerRole | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set());
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<QuizError | null>(null);

  const totalQuestions = questions.length;

  const currentIndex = useMemo(
    () => questions.findIndex((q) => !answeredIds.has(q.id)),
    [questions, answeredIds],
  );
  const currentQuestion = currentIndex >= 0 ? questions[currentIndex] : null;

  const loadForRole = useCallback(
    async (role: PlayerRole) => {
      const playerId = playerIdForRole(record, role);
      const state = await getSessionState(sessionId, playerId);
      setQuestions(state.questions);
      setAnsweredIds(new Set(state.you.answeredQuestionIds));
      return state;
    },
    [sessionId, record],
  );

  const determineInitialPhase = useCallback(async () => {
    const player1Id = record.player1Id ?? record.playerId;
    const state = await getSessionState(sessionId, player1Id);
    const total = state.session.questionCount;
    const p1Count = state.you.answeredQuestionIds.length;
    const p2Count = state.partner.answeredQuestionIds.length;

    if (p1Count < total) {
      return { phase: 'quiz' as const, role: 'player1' as const, state };
    }
    if (p2Count < total) {
      return {
        phase: (p2Count === 0 ? 'handoff' : 'quiz') as Phase,
        role: 'player2' as const,
        state,
      };
    }
    return { phase: 'results' as const, role: null, state };
  }, [sessionId, record]);

  const goToResults = useCallback(async () => {
    const player2Id = record.player2Id ?? record.playerId;
    await saveSession({
      ...record,
      role: 'player2',
      playerId: player2Id,
    });
    markLeaving();
    router.replace(`/results/${sessionId}`);
  }, [record, sessionId, router, markLeaving]);

  // Bootstrap: figure out whose turn it is from the server, never from stale
  // local state. This is the resume path after the app is killed.
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const {
          phase: initialPhase,
          role,
          state,
        } = await determineInitialPhase();
        if (!mounted) return;

        if (initialPhase === 'results') {
          await goToResults();
          return;
        }

        setPhase(initialPhase);
        if (role) setCurrentRole(role);
        setQuestions(state.questions);
        setAnsweredIds(new Set(state.you.answeredQuestionIds));
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(normalizeQuizError(err));
        setPhase('quiz');
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, [determineInitialPhase, goToResults]);

  // Rehydrate when the screen comes back to the foreground. The previous
  // player's answers are never returned in the payload, so this cannot leak
  // them across the handoff.
  useFocusEffect(
    useCallback(() => {
      if (!currentRole || phase !== 'quiz') return;

      let mounted = true;
      loadForRole(currentRole).catch((err) => {
        if (!mounted) return;
        setError(normalizeQuizError(err));
      });

      return () => {
        mounted = false;
      };
    }, [currentRole, phase, loadForRole]),
  );

  // Clear any in-flight local input whenever the question changes.
  useEffect(() => {
    setSelectedOption(null);
    setTextAnswer('');
  }, [currentQuestion?.id]);

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
    if (!currentQuestion || isSubmitting || !currentRole) return;

    const answer =
      currentQuestion.type === 'mcq' ? selectedOption : textAnswer.trim();
    if (!answer) return;

    setIsSubmitting(true);
    try {
      const playerId = playerIdForRole(record, currentRole);
      await submitAnswer(
        { sessionId, questionId: currentQuestion.id, answer },
        playerId,
      );

      const nextAnswered = new Set(answeredIds);
      nextAnswered.add(currentQuestion.id);
      setAnsweredIds(nextAnswered);
      setSelectedOption(null);
      setTextAnswer('');

      if (nextAnswered.size >= totalQuestions) {
        if (currentRole === 'player1') {
          setPhase('handoff');
        } else {
          await goToResults();
        }
      }
    } catch (err) {
      setError(normalizeQuizError(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    currentQuestion,
    isSubmitting,
    currentRole,
    selectedOption,
    textAnswer,
    sessionId,
    record,
    answeredIds,
    totalQuestions,
    goToResults,
  ]);

  const continueToNextPlayer = useCallback(async () => {
    if (!currentRole) return;

    const nextRole: PlayerRole =
      currentRole === 'player1' ? 'player2' : 'player1';
    const nextPlayerId = playerIdForRole(record, nextRole);

    setPhase('loading');
    setSelectedOption(null);
    setTextAnswer('');

    try {
      await saveSession({
        ...record,
        role: nextRole,
        playerId: nextPlayerId,
      });
      const state = await loadForRole(nextRole);
      setCurrentRole(nextRole);
      setAnsweredIds(new Set(state.you.answeredQuestionIds));
      setError(null);
      setPhase('quiz');
    } catch (err) {
      setError(normalizeQuizError(err));
      setPhase('handoff');
    }
  }, [currentRole, record, loadForRole]);

  const handleRetry = useCallback(async () => {
    setError(null);

    if (!currentRole) {
      setPhase('loading');
      try {
        const {
          phase: initialPhase,
          role,
          state,
        } = await determineInitialPhase();
        if (initialPhase === 'results') {
          await goToResults();
          return;
        }
        setPhase(initialPhase);
        if (role) setCurrentRole(role);
        setQuestions(state.questions);
        setAnsweredIds(new Set(state.you.answeredQuestionIds));
      } catch (err) {
        setError(normalizeQuizError(err));
        setPhase('quiz');
      }
      return;
    }

    setPhase('loading');
    try {
      await loadForRole(currentRole);
      setPhase('quiz');
    } catch (err) {
      setError(normalizeQuizError(err));
      setPhase('quiz');
    }
  }, [currentRole, determineInitialPhase, goToResults, loadForRole]);

  const canSubmit =
    !isSubmitting &&
    (currentQuestion?.type === 'mcq'
      ? !!selectedOption
      : textAnswer.trim().length > 0);

  const submitLabel = currentIndex >= totalQuestions - 1 ? 'FINISH' : 'NEXT ->';

  return {
    phase,
    currentRole,
    isLoading: phase === 'loading',
    error,
    currentQuestion,
    currentIndex,
    totalQuestions,
    progress: answeredIds.size,
    selectedOption,
    textAnswer,
    isSubmitting,
    canSubmit,
    submitLabel,
    handleSelectOption,
    handleTextChange,
    submitCurrent,
    continueToNextPlayer,
    handleRetry,
    onLeave: () => router.replace('/'),
  };
}
