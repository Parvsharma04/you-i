'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import styles from './page.module.css';

const CATEGORIES = [
  { id: 'love', label: '<3 LOVE' },
  { id: 'friendship', label: 'BFFS' },
  { id: 'deep_talk', label: 'DEEP' },
  { id: 'fun', label: 'FUN' },
  { id: 'spicy', label: 'SPICY' },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

export default function LandingPage() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!category) { setError('Select a mode to play.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.createSession(category, questionCount);
      sessionStorage.setItem(`player_${result.sessionId}`, JSON.stringify({
        playerId: result.player1Id, isHost: true,
      }));
      router.push(`/lobby/${result.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection Error.');
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className="container" style={{ justifyContent: 'center', gap: '32px' }}>
        <div className={styles.hero}>
          <div className={styles.logoWrapper}>
            <span className={styles.logo}>&lt;3</span>
          </div>
          <h1 className="text-love">
            HIM &amp; HER
          </h1>
          <p className={styles.subtitle}>
            PLAYER 1, PRESS START
          </p>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>SELECT MODE:</h3>
          <div className={styles.categories}>
            {CATEGORIES.map((cat) => (
              <button key={cat.id} id={`category-${cat.id}`}
                className={`category-pill ${cat.id} ${category === cat.id ? 'active' : ''}`}
                onClick={() => { setCategory(cat.id); setError(''); }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>ROUNDS:</h3>
          <div className={styles.counts}>
            {QUESTION_COUNTS.map((c) => (
              <button key={c} id={`count-${c}`}
                className={`count-btn ${questionCount === c ? 'active' : ''}`}
                onClick={() => setQuestionCount(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button id="start-quiz-btn" className="btn-primary" onClick={handleStart}
          disabled={loading} style={{ width: '100%', padding: '16px' }}>
          {loading ? 'LOADING...' : 'START GAME'}
        </button>

      </div>
    </main>
  );
}
