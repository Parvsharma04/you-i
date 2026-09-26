'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, loadPlayerInfo, type StoredPlayerInfo } from '@/lib/api';
import type { SessionResponse } from '@youandi/shared';
import { useSocket } from '@/lib/useSocket';
import RoomCodeCard from './room-code-card';


interface LobbyBrowserProps {
  sessionId: string;
  session: SessionResponse;
  onLeave?: () => void;
}

function getStoredPlayerInfo(sessionId: string): StoredPlayerInfo | null {
  return loadPlayerInfo(sessionId);
}

export default function LobbyBrowser({ sessionId, session: initialSession, onLeave }: LobbyBrowserProps) {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse>(initialSession);
  const [playerInfo, setPlayerInfo] = useState<StoredPlayerInfo | null>(() => getStoredPlayerInfo(sessionId));
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const { on } = useSocket(sessionId, playerInfo?.playerId ?? null);

  // Listen for player joining.
  useEffect(() => {
    if (!playerInfo) return;

    const unsub = on('playerJoined', () => {
      api.getSession(sessionId).then(setSession);
    });

    return unsub;
  }, [playerInfo, on, sessionId]);

  // Auto-redirect when both players are in.
  useEffect(() => {
    if (session.status === 'active') {
      const timer = setTimeout(() => {
        router.push(`/quiz/${sessionId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [session.status, sessionId, router]);

  const handleJoin = async () => {
    // Joining is now code-based from the home screen.
    router.push('/');
  };

  const roomCode = session.code;

  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/lobby/${sessionId}`
    : '';

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = shareLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareLink]);

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`PLAYER 2 PRESS START: \n\n${shareLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const isHost = playerInfo?.isHost;
  const isWaiting = session.status === 'waiting';
  const isActive = session.status === 'active';
  const needsToJoin = !playerInfo && isWaiting;

  return (
    <main className="min-h-screen flex items-center">
      <div className="container-custom" style={{ justifyContent: 'center', gap: '32px' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <span className="inline-block py-1 px-3 bg-bg-card border-2 border-border-color text-[1.2rem] font-display text-text-primary uppercase shadow-retro-sm">
            MODE: {session.category.replace('_', ' ')}
          </span>
          <h2>
            {isActive ? (
              <span className="text-love">READY TO PLAY!</span>
            ) : needsToJoin ? (
              'PLAYER 2 INVITED'
            ) : (
              'WAITING FOR P2...'
            )}
          </h2>
          <p className="text-text-secondary text-[1.1rem] font-display">
            {isActive
              ? 'LOADING LEVEL...'
              : needsToJoin
                ? 'PRESS START TO JOIN'
                : `${session.questionCount} STAGES · SHARE LINK TO CO-OP`}
          </p>
        </div>

        {isActive && (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="spinner" />
            <p>LOADING...</p>
          </div>
        )}

        {needsToJoin && (
          <div className="flex flex-col gap-4">
            <button
              id="join-btn"
              className="btn-primary"
              onClick={handleJoin}
              disabled={joining}
              style={{ width: '100%', padding: '16px' }}
            >
              {joining ? 'JOINING...' : 'JOIN GAME'}
            </button>
            {error && <p className="text-red-500 text-base text-center font-display">{error}</p>}
          </div>
        )}

        {isHost && isWaiting && roomCode && (
          <>
            <RoomCodeCard code={roomCode} expiresAt={session.codeExpiresAt ?? null} />

            <div className="p-6 flex flex-col gap-4 bg-bg-card border-4 border-border-color shadow-retro">
              <p className="text-[1.2rem] font-display text-text-primary">INVITE LINK</p>
              <div className="p-3 bg-bg-secondary border-2 border-border-color overflow-x-auto shadow-input">
                <code className="text-base text-text-primary break-all">{shareLink}</code>
              </div>
              <div className="flex gap-2.5 flex-wrap justify-center">
                <button id="copy-link-btn" className="share-btn" onClick={handleCopyLink}>
                  {copied ? 'COPIED!' : 'COPY'}
                </button>
                <button id="share-whatsapp-btn" className="share-btn whatsapp" onClick={handleShareWhatsApp}>
                  WHATSAPP
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-5 mt-6">
              <div className="pulseRing" />
              <p className="waiting-dots text-text-secondary text-[1.1rem] font-display">
                AWAITING CONNECTION<span>.</span><span>.</span><span>.</span>
              </p>
            </div>
          </>
        )}

        {playerInfo && !isHost && isWaiting && (
          <div className="flex flex-col items-center gap-5 mt-6">
            <div className="pulseRing" />
            <p className="waiting-dots text-text-secondary text-[1.1rem] font-display">
              WAITING FOR HOST<span>.</span><span>.</span><span>.</span>
            </p>
          </div>
        )}

        {onLeave && (
          <div className="text-center">
            <button className="text-text-muted font-body text-sm underline" onClick={onLeave}>
              Back to invite
            </button>
          </div>
        )}
      </div>

      <div className={`toast ${copied ? 'show' : ''}`}>LINK COPIED</div>
    </main>
  );
}
