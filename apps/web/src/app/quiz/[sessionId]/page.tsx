'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, Question } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';


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
      <main className="min-h-screen">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '3rem' }}>X_X</span>
          <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
        </div>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="min-h-screen">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner" />
        </div>
      </main>
    );
  }

  // Waiting for other player to finish
  if (waitingForOther) {
    return (
      <main className="min-h-screen">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
          <div className="text-center flex flex-col items-center gap-4 p-10 animate-[bounceIn_0.8s_ease_forwards]">
            <span style={{ fontSize: '4rem' }}>^__^</span>
            <h2>STAGE CLEAR</h2>
            <p className="text-text-secondary text-base font-medium">
              AWAITING P2<span className="waiting-dots"><span>.</span><span>.</span><span>.</span></span>
            </p>
            <div className="flex flex-col items-center gap-2 mt-4 w-full max-w-[300px]">
              <p className="text-[0.75rem] font-bold text-text-muted lowercase tracking-[1.5px] w-10 shrink-0 text-center">P2 PROGRESS</p>
              <div className="progress-bar-container" style={{ maxWidth: 300 }}>
                <div className="progress-bar-fill" style={{ width: `${otherProgress}%` }} />
              </div>
              <p className="text-[0.85rem] text-text-muted font-bold">{Math.round(otherProgress)}%</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="container-custom" style={{ gap: '24px', paddingTop: '40px' }}>
        {/* Top bar */}
        <div className="flex justify-between items-center animate-[fadeIn_0.4s_ease]">
          <span className="text-[0.85rem] font-bold text-text-muted tracking-[1.5px] lowercase">
            STAGE {currentIndex + 1}/{questions.length}
          </span>
          <span className="py-1.5 px-4 bg-[rgba(255,20,147,0.08)] border border-[rgba(255,105,180,0.15)] rounded-none text-[0.8rem] text-text-secondary font-semibold">
            {playerInfo?.isHost ? 'PLAYER 1' : 'PLAYER 2'}
          </span>
        </div>

        {/* Progress bars */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-[0.75rem] font-bold text-text-muted lowercase tracking-[1.5px] w-10 shrink-0">YOU</span>
            <div className="progress-bar-container" style={{ flex: 1 }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[0.75rem] font-bold text-text-muted lowercase tracking-[1.5px] w-10 shrink-0" style={{ opacity: 0.5 }}>P2</span>
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
        <div className="flex flex-col gap-6 py-8 px-6 bg-[rgba(255,255,255,0.7)] border border-[rgba(139,0,0,0.2)] rounded-none backdrop-blur-[20px] animate-[fadeInUp_0.5s_ease_forwards] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[rgba(255,182,193,0.4)] before:to-transparent" key={currentIndex}>
          <h2 className="text-[1.3rem] font-bold leading-[1.4]">{currentQuestion.text}</h2>

          {currentQuestion.type === 'mcq' && currentQuestion.options ? (
            <div className="flex flex-col gap-2.5">
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
              className="text-input resize-y min-h-[80px] max-h-[200px]"
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
