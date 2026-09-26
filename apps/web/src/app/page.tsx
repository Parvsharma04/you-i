'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, savePlayerInfo } from '@/lib/api';
import { getDeviceId } from '@/lib/device-id';


const CATEGORIES = [
  { id: 'love', label: '<3 LOVE' },
  { id: 'friendship', label: 'BFFS' },
  { id: 'deep_talk', label: 'DEEP' },
  { id: 'fun', label: 'FUN' },
  { id: 'spicy', label: 'SPICY' },
  { id: 'fantasy', label: 'FANTASY' },
  { id: 'interests', label: 'INTERESTS' },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

export default function LandingPage() {
  const router = useRouter();
  const [category, setCategory] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const handleStart = async () => {
    if (!category) { setError('Select a mode to play.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.createSession(category, questionCount);
      savePlayerInfo(result.sessionId, {
        playerId: result.playerId,
        isHost: true,
        deviceId: getDeviceId(),
      });
      setCreatedCode(result.code);
      router.push(`/lobby/${result.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection Error.');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) { setError('Enter a room code.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.joinSession(joinCode.trim());
      savePlayerInfo(result.sessionId, {
        playerId: result.playerId,
        isHost: false,
        deviceId: getDeviceId(),
      });
      router.push(`/lobby/${result.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center">
      <div className="container-custom" style={{ justifyContent: 'center', gap: '32px' }}>
        <div className="text-center flex flex-col items-center gap-4 mb-6">
          <div className="w-[80px] h-[80px] bg-bg-card flex items-center justify-center border-4 border-border-color shadow-retro">
            <span className="text-2xl font-display text-accent">&lt;3</span>
          </div>
          <h1 className="text-love">
            You &amp; I
          </h1>
          <p className="text-text-secondary text-[1.2rem] leading-relaxed font-display uppercase">
            PLAYER 1, PRESS START
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-[1.2rem] font-display text-text-primary">SELECT MODE:</h3>
          <div className="flex flex-wrap gap-3">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} id={`category-${cat.id}`}
                className={`category-pill ${cat.id} ${category === cat.id ? 'active' : ''}`}
                onClick={() => { setCategory(cat.id); setError(''); }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-[1.2rem] font-display text-text-primary">ROUNDS:</h3>
          <div className="flex gap-3">
            {QUESTION_COUNTS.map((c) => (
              <button key={c} id={`count-${c}`}
                className={`count-btn ${questionCount === c ? 'active' : ''}`}
                onClick={() => setQuestionCount(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-base text-center font-display">{error}</p>}

        <button id="start-quiz-btn" className="btn-primary" onClick={handleStart}
          disabled={loading} style={{ width: '100%', padding: '16px' }}>
          {loading ? 'LOADING...' : 'START GAME'}
        </button>

        <div className="flex flex-col gap-4 mt-6">
          <h3 className="text-[1.2rem] font-display text-text-primary text-center">OR ENTER CODE:</h3>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="6-DIGIT CODE"
            maxLength={6}
            className="p-3 bg-bg-secondary border-2 border-border-color text-text-primary text-center font-display tracking-widest"
          />
          <button id="join-btn" className="btn-primary" onClick={handleJoin}
            disabled={loading || joinCode.trim().length < 6} style={{ width: '100%', padding: '16px' }}>
            {loading ? 'JOINING...' : 'JOIN GAME'}
          </button>
        </div>

      </div>
    </main>
  );
}
