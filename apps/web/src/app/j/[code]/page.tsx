'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

export default function JoinByCodePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code ?? '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = useCallback(async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.joinSession(code.trim());
      sessionStorage.setItem(
        `player_${result.sessionId}`,
        JSON.stringify({ playerId: result.playerId, isHost: false }),
      );
      router.push(`/lobby/${result.sessionId}`);
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Could not join.');
    }
  }, [code, router]);

  return (
    <main className="min-h-screen flex items-center">
      <div className="container-custom" style={{ justifyContent: 'center', gap: '32px' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <h1 className="text-love">You &amp; I</h1>
          <p className="text-text-secondary text-[1.2rem] leading-relaxed font-display uppercase">
            JOIN GAME
          </p>
        </div>

        <div className="border-4 border-border-color bg-bg-card p-6 text-center shadow-retro">
          <p className="text-text-secondary font-body mb-2">ROOM CODE</p>
          <p className="text-4xl font-display text-text-primary tracking-widest">
            {code}
          </p>
        </div>

        {error && (
          <p className="text-red-500 text-base text-center font-display">{error}</p>
        )}

        <button
          className="btn-primary"
          onClick={handleJoin}
          disabled={loading}
          style={{ width: '100%', padding: '16px' }}
        >
          {loading ? 'JOINING...' : 'JOIN GAME'}
        </button>
      </div>
    </main>
  );
}
