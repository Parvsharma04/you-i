'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, QuizResult } from '@/lib/api';
import styles from './results.module.css';

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
      ? `HIM & HER SCORE: ${result.score}%. PLAY: ${shareLink}`
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
      `HIM & HER SCORE: ${result?.score ?? '??'}%. \n\nPLAY NOW: ${shareLink}`
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
      <main className={styles.main}>
        <div className="container" style={{ justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
          <div className={styles.loadingCard}>
            <div className="spinner" />
            <h3>ANALYZING...</h3>
            <p className={styles.loadingSubtext}>
              CALCULATING VIBES
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className={styles.main}>
        <div className="container" style={{ justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
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
    <main className={styles.main}>
      <div className="container" style={{ gap: '32px', paddingTop: '40px', paddingBottom: '60px' }}>
        {/* Score Section */}
        <div className={styles.scoreSection}>
          <span className={styles.resultEmoji}>{getScoreEmoji(result.score)}</span>

          <div className="score-circle">
            <span className="score-number">{animatedScore}</span>
          </div>

          <h2 className={styles.scoreLabel}>
            <span className="text-gradient">{getScoreLabel(result.score)}</span>
          </h2>

          <p className={styles.scorePercent}>{result.score}% MATCH</p>
        </div>

        {/* AI Summary */}
        {showContent && (
          <>
            <div className={`glass-card ${styles.summaryCard}`}>
              <div className={styles.cardHeader}>
                <h3>SYSTEM ANALYSIS</h3>
              </div>
              <p className={styles.summaryText}>{result.summary}</p>
            </div>

            {/* Strengths */}
            <div className={`glass-card ${styles.listCard}`}>
              <div className={styles.cardHeader}>
                <h3>STRENGTHS</h3>
              </div>
              <div className={styles.tagList}>
                {result.strengths.map((s, i) => (
                  <span key={i} className="tag strength">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Differences */}
            <div className={`glass-card ${styles.listCard}`}>
              <div className={styles.cardHeader}>
                <h3>WEAKNESSES</h3>
              </div>
              <div className={styles.tagList}>
                {result.differences.map((d, i) => (
                  <span key={i} className="tag difference">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Share Section */}
            <div className={styles.shareSection}>
              <h3 className={styles.shareTitle}>SHARE RECORD:</h3>
              <div className={styles.shareActions}>
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
