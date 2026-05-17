'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, Question } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';
import styles from './quiz.module.css';

interface PlayerInfo {
  playerId: string;
  isHost: boolean;
}

export default function QuizPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [textAnswer, setTextAnswer] = useState('');
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otherPlayerProgress, setOtherPlayerProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [waitingForOther, setWaitingForOther] = useState(false);
  const [error, setError] = useState('');

  const { emitAnswer, emitComplete, on } = useSocket(
    sessionId,
    playerInfo?.playerId ?? null,
  );

  // Load player info and questions
  useEffect(() => {
    const stored = sessionStorage.getItem(`player_${sessionId}`);
    if (stored) {
      setPlayerInfo(JSON.parse(stored));
    } else {
      router.push(`/lobby/${sessionId}`);
      return;
    }

    api.getQuestions(sessionId).then(setQuestions).catch(() => {
      setError('FAILED TO LOAD STAGE');
    });
  }, [sessionId, router]);

  // Listen for other player's events
  useEffect(() => {
    if (!playerInfo) return;

    const unsubAnswer = on('answerSubmitted', (...args: unknown[]) => {
      const data = args[0] as { answerIndex: number };
      setOtherPlayerProgress((prev) => Math.max(prev, data.answerIndex + 1));
    });

    const unsubComplete = on('playerComplete', () => {
      if (isComplete) {
        // Both done, go to results
        router.push(`/results/${sessionId}`);
      } else {
        setWaitingForOther(false);
      }
    });

    return () => {
      unsubAnswer?.();
      unsubComplete?.();
    };
  }, [playerInfo, on, isComplete, sessionId, router]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;
  const otherProgress = questions.length > 0 ? (otherPlayerProgress / questions.length) * 100 : 0;

  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion || !playerInfo) return;

    const answer = currentQuestion.type === 'mcq' ? selectedAnswer : textAnswer;
    if (!answer.trim()) return;

    setSubmitting(true);

    try {
      await api.submitAnswer(sessionId, currentQuestion.id, playerInfo.playerId, answer);
      emitAnswer(currentQuestion.id, currentIndex);

      if (currentIndex >= questions.length - 1) {
        // Quiz complete
        setIsComplete(true);
        emitComplete();

        // Check if other player is done
        const count = await api.getAnswerCount(sessionId);
        if (count.bothComplete) {
          router.push(`/results/${sessionId}`);
        } else {
          setWaitingForOther(true);
        }
      } else {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer('');
        setTextAnswer('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FAILED TO SUBMIT');
    } finally {
      setSubmitting(false);
    }
  }, [currentQuestion, playerInfo, selectedAnswer, textAnswer, sessionId, currentIndex, questions.length, emitAnswer, emitComplete, router]);

  if (error) {
    return (
      <main className={styles.main}>
        <div className="container" style={{ justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '3rem' }}>X_X</span>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className={styles.main}>
        <div className="container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner" />
        </div>
      </main>
    );
  }

  // Waiting for other player to finish
  if (waitingForOther) {
    return (
      <main className={styles.main}>
        <div className="container" style={{ justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
          <div className={styles.doneCard}>
            <span style={{ fontSize: '4rem' }}>^__^</span>
            <h2>STAGE CLEAR</h2>
            <p className={styles.waitText}>
              AWAITING P2<span className="waiting-dots"><span>.</span><span>.</span><span>.</span></span>
            </p>
            <div className={styles.otherProgressSection}>
              <p className={styles.progressLabel}>P2 PROGRESS</p>
              <div className="progress-bar-container" style={{ maxWidth: 300 }}>
                <div className="progress-bar-fill" style={{ width: `${otherProgress}%` }} />
              </div>
              <p className={styles.progressPercent}>{Math.round(otherProgress)}%</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className="container" style={{ gap: '24px', paddingTop: '40px' }}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <span className={styles.questionCounter}>
            STAGE {currentIndex + 1}/{questions.length}
          </span>
          <span className={styles.playerBadge}>
            {playerInfo?.isHost ? 'PLAYER 1' : 'PLAYER 2'}
          </span>
        </div>

        {/* Progress bars */}
        <div className={styles.progressSection}>
          <div className={styles.progressRow}>
            <span className={styles.progressLabel}>YOU</span>
            <div className="progress-bar-container" style={{ flex: 1 }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className={styles.progressRow}>
            <span className={styles.progressLabel} style={{ opacity: 0.5 }}>P2</span>
            <div className="progress-bar-container" style={{ flex: 1 }}>
              <div
                className="progress-bar-fill"
                style={{
                  width: `${otherProgress}%`,
                  background: 'var(--text-muted)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className={styles.questionCard} key={currentIndex}>
          <h2 className={styles.questionText}>{currentQuestion.text}</h2>

          {currentQuestion.type === 'mcq' && currentQuestion.options ? (
            <div className={styles.options}>
              {currentQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  id={`option-${i}`}
                  className={`option-card ${selectedAnswer === opt ? 'selected' : ''}`}
                  onClick={() => setSelectedAnswer(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              id="text-answer"
              className={`text-input ${styles.textArea}`}
              placeholder="TYPE YOUR ANSWER..."
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              rows={3}
            />
          )}
        </div>

        {/* Submit */}
        <button
          id="submit-answer-btn"
          className="btn-primary"
          onClick={handleSubmitAnswer}
          disabled={
            submitting ||
            (currentQuestion.type === 'mcq' ? !selectedAnswer : !textAnswer.trim())
          }
          style={{ width: '100%', padding: '16px', marginTop: 'auto' }}
        >
          {submitting ? (
            'LOADING...'
          ) : currentIndex >= questions.length - 1 ? (
            'FINISH'
          ) : (
            'NEXT ->'
          )}
        </button>
      </div>
    </main>
  );
}
