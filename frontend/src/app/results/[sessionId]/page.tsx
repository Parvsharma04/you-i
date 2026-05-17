'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, QuizResult } from '@/lib/api';


export default function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadResults = async () => {
      try {
        // Try to get existing result first
        let data = await api.getResult(sessionId);
        if (!data) {
          // Generate new result
          data = await api.generateResult(sessionId);
        }
        setResult(data);
        setLoading(false);

        // Animate score counter
        if (data) {
          let current = 0;
          const target = data.score;
          const duration = 1500; // faster for retro feel
          const step = target / (duration / 16);

          const timer = setInterval(() => {
            current += step;
            if (current >= target) {
              current = target;
              clearInterval(timer);
              setTimeout(() => setShowContent(true), 300);
            }
            setAnimatedScore(Math.round(current));
          }, 16);

          return () => clearInterval(timer);
        }
      } catch {
        setLoading(false);
      }
    };

    loadResults();
  }, [sessionId]);

  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/lobby/${sessionId}`
    : '';

  const handleCopy = useCallback(async () => {
    const shareText = result
      ? `YOU & I SCORE: ${result.score}%. PLAY: ${shareLink}`
      : shareLink;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result, shareLink]);

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `YOU & I SCORE: ${result?.score ?? '??'}%. \n\nPLAY NOW: ${shareLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNewQuiz = () => {
    router.push('/');
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '★_★';
    if (score >= 75) return '^__^';
    if (score >= 60) return '-__-';
    if (score >= 40) return 'O_O';
    return 'X_X';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'S-RANK';
    if (score >= 75) return 'A-RANK';
    if (score >= 60) return 'B-RANK';
    if (score >= 40) return 'C-RANK';
    return 'F-RANK';
  };

  if (loading) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
          <div className="text-center flex flex-col items-center gap-5 p-10 animate-[fadeIn_0.6s_ease]">
            <div className="spinner" />
            <h3>ANALYZING...</h3>
            <p className="text-text-muted text-[0.95rem] font-medium italic">
              CALCULATING VIBES
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '4rem' }}>X_X</span>
          <h2>DATA NOT FOUND</h2>
          <p style={{ color: 'var(--text-secondary)' }}>BOTH PLAYERS MUST FINISH.</p>
          <button className="btn-primary" onClick={() => router.push(`/quiz/${sessionId}`)}>
            BACK TO STAGE
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="container-custom" style={{ gap: '32px', paddingTop: '40px', paddingBottom: '60px' }}>
        {/* Score Section */}
        <div className="flex flex-col items-center gap-[18px] py-5 animate-[fadeInUp_0.8s_ease_forwards]">
          <span className="text-[3.5rem] animate-[bounceIn_0.8s_ease_0.3s_both]">{getScoreEmoji(result.score)}</span>

          <div className="score-circle">
            <span className="score-number">{animatedScore}</span>
          </div>

          <h2 className="text-[1.6rem] text-center font-display">
            <span className="text-gradient">{getScoreLabel(result.score)}</span>
          </h2>

          <p className="text-text-secondary text-base font-semibold">{result.score}% MATCH</p>
        </div>

        {/* AI Summary */}
        {showContent && (
          <>
            <div className="glass-card p-6 flex flex-col gap-4 opacity-0 animate-[fadeInUp_0.6s_ease_forwards] [animation-delay:0.1s]">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[1.1rem] font-bold">SYSTEM ANALYSIS</h3>
              </div>
              <p className="text-text-secondary text-base leading-[1.7] font-medium">{result.summary}</p>
            </div>

            {/* Strengths */}
            <div className="glass-card p-6 flex flex-col gap-4 opacity-0 animate-[fadeInUp_0.6s_ease_forwards] [animation-delay:0.2s]">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[1.1rem] font-bold">STRENGTHS</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.strengths.map((s, i) => (
                  <span key={i} className="tag strength">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Differences */}
            <div className="glass-card p-6 flex flex-col gap-4 opacity-0 animate-[fadeInUp_0.6s_ease_forwards] [animation-delay:0.3s]">
              <div className="flex items-center gap-2.5">
                <h3 className="text-[1.1rem] font-bold">WEAKNESSES</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.differences.map((d, i) => (
                  <span key={i} className="tag difference">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Share Section */}
            <div className="text-center flex flex-col items-center gap-4 animate-[fadeInUp_0.6s_ease_0.4s_both]">
              <h3 className="text-base font-bold text-text-secondary">SHARE RECORD:</h3>
              <div className="flex gap-3 flex-wrap justify-center">
                <button
                  id="copy-result-btn"
                  className="share-btn"
                  onClick={handleCopy}
                >
                  {copied ? 'COPIED' : 'COPY'}
                </button>
                <button
                  id="whatsapp-result-btn"
                  className="share-btn whatsapp"
                  onClick={handleShareWhatsApp}
                >
                  WHATSAPP
                </button>
              </div>
            </div>

            {/* New Quiz CTA */}
            <button
              id="new-quiz-btn"
              className="btn-primary"
              onClick={handleNewQuiz}
              style={{ width: '100%', padding: '16px' }}
            >
              PLAY AGAIN
            </button>
          </>
        )}
      </div>

      {/* Toast */}
      <div className={`toast ${copied ? 'show' : ''}`}>
        RECORD COPIED
      </div>
    </main>
  );
}
