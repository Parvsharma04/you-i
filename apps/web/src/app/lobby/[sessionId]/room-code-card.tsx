'use client';

import { useEffect, useState, useCallback } from 'react';

interface RoomCodeCardProps {
  code: string;
  expiresAt?: string | null;
}

function useCountdown(expiresAt?: string | null): string | null {
  const [remaining, setRemaining] = useState<string | null>(null);

  const calc = useCallback(() => {
    if (!expiresAt) return null;
    const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    if (diff <= 0) return 'EXPIRED';
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt) return;
    setRemaining(calc());
    const id = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(id);
  }, [expiresAt, calc]);

  return remaining;
}

export default function RoomCodeCard({ code, expiresAt }: RoomCodeCardProps) {
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(expiresAt);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpired = countdown === 'EXPIRED';

  return (
    <div className="p-6 flex flex-col gap-4 bg-bg-card border-4 border-border-color shadow-retro">
      <div className="flex items-center justify-between">
        <p className="text-[1.2rem] font-display text-text-primary">ROOM CODE</p>
        {countdown && (
          <span
            className={`text-sm font-display ${isExpired ? 'text-red-500' : 'text-text-muted'}`}
          >
            {isExpired ? 'EXPIRED' : `EXPIRES IN ${countdown}`}
          </span>
        )}
      </div>

      <div className="p-3 bg-bg-secondary border-2 border-border-color overflow-x-auto shadow-input flex items-center justify-between gap-3">
        <code className="text-2xl text-text-primary tracking-widest font-display">{code}</code>
        <button
          className="share-btn shrink-0"
          onClick={handleCopy}
          aria-label="Copy room code"
        >
          {copied ? 'COPIED!' : 'COPY'}
        </button>
      </div>

      <p className="text-text-secondary text-base font-display text-center">
        Share this code with Player 2.
      </p>
    </div>
  );
}
