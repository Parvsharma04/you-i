'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api, savePlayerInfo } from '@/lib/api';
import { getDeviceId } from '@/lib/device-id';
import { normalizeCode, joinErrorMessage } from '@/lib/join-code';

const CODE_LENGTH = 6;

export default function JoinPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const currentCode = digits.join('');

  const handleChange = (index: number, value: string) => {
    const normalized = normalizeCode(value);
    if (!normalized && value !== '') return;

    if (normalized.length > 1) {
      // Handle paste: distribute characters across fields.
      const chars = normalized.slice(0, CODE_LENGTH).split('');
      const next = [...digits];
      chars.forEach((ch, i) => { if (index + i < CODE_LENGTH) next[index + i] = ch; });
      setDigits(next);
      setError('');
      const focusAt = Math.min(index + chars.length, CODE_LENGTH - 1);
      inputRefs.current[focusAt]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = normalized;
    setDigits(next);
    setError('');

    if (normalized && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async () => {
    const code = currentCode.trim();
    if (code.length < CODE_LENGTH) { setError('Enter all 6 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.joinSession(code);
      savePlayerInfo(result.sessionId, {
        playerId: result.playerId,
        isHost: false,
        deviceId: getDeviceId(),
      });
      router.push(`/lobby/${result.sessionId}`);
    } catch (err) {
      const raw = err as Error & { code?: string };
      setError(raw.code ? joinErrorMessage(raw.code) : (raw.message || 'Could not join. Try again.'));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center">
      <div className="container-custom" style={{ justifyContent: 'center', gap: '32px' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <h1 className="text-love">You &amp; I</h1>
          <p className="text-text-secondary text-[1.2rem] leading-relaxed font-display uppercase">
            ENTER ROOM CODE
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex gap-2 justify-center">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="text"
                value={digit}
                maxLength={6}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                disabled={loading}
                className="w-12 h-14 bg-bg-secondary border-2 border-border-color text-text-primary text-center text-2xl font-display tracking-widest outline-none focus:border-accent shadow-input"
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-base text-center font-display">{error}</p>
          )}

          <button
            className="btn-primary"
            onClick={handleJoin}
            disabled={loading || currentCode.length < CODE_LENGTH}
            style={{ width: '100%', padding: '16px' }}
          >
            {loading ? 'JOINING...' : 'JOIN GAME'}
          </button>

          <button
            className="text-text-muted font-body text-sm underline text-center"
            onClick={() => router.push('/')}
          >
            Back to main menu
          </button>
        </div>
      </div>
    </main>
  );
}
