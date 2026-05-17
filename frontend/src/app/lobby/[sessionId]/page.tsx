'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, SessionResponse } from '@/lib/api';
import { useSocket } from '@/lib/useSocket';


interface PlayerInfo {
  playerId: string;
  isHost: boolean;
}

export default function LobbyPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const { on } = useSocket(sessionId, playerInfo?.playerId ?? null);

  // Load session and player info
  useEffect(() => {
    const loadSession = async () => {
      try {
        const sess = await api.getSession(sessionId);
        setSession(sess);

        // Check if we already have player info
        const stored = sessionStorage.getItem(`player_${sessionId}`);
        if (stored) {
          setPlayerInfo(JSON.parse(stored));
        }
      } catch {
        setError('SESSION NOT FOUND');
      }
    };

    loadSession();
  }, [sessionId]);

  // Listen for player joining
  useEffect(() => {
    if (!playerInfo) return;

    const unsub = on('playerJoined', () => {
      // Refresh session
      api.getSession(sessionId).then(setSession);
    });

    return unsub;
  }, [playerInfo, on, sessionId]);

  // Auto-redirect when both players are in
  useEffect(() => {
    if (session?.status === 'active') {
      setTimeout(() => {
        router.push(`/quiz/${sessionId}`);
      }, 1500);
    }
  }, [session?.status, sessionId, router]);

  const handleJoin = async () => {
    setJoining(true);
    setError('');
    try {
      const result = await api.joinSession(sessionId);
      const info: PlayerInfo = {
        playerId: result.player2Id,
        isHost: false,
      };
      sessionStorage.setItem(`player_${sessionId}`, JSON.stringify(info));
      setPlayerInfo(info);

      // Refresh session to see updated status
      const updatedSession = await api.getSession(sessionId);
      setSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'COULD NOT JOIN SESSION');
      setJoining(false);
    }
  };

  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/lobby/${sessionId}`
    : '';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
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
    const text = encodeURIComponent(
      `PLAYER 2 PRESS START: \n\n${shareLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (error && !session) {
    return (
      <main className="min-h-screen flex items-center">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '4rem' }}>X_X</span>
          <h2>{error}</h2>
          <button className="btn-primary" onClick={() => router.push('/')}>
            MAIN MENU
          </button>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center">
        <div className="container-custom" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner" />
        </div>
      </main>
    );
  }

  const isHost = playerInfo?.isHost;
  const isWaiting = session.status === 'waiting';
  const isActive = session.status === 'active';
  const needsToJoin = !playerInfo && isWaiting;

  return (
    <main className="min-h-screen flex items-center">
      <div className="container-custom" style={{ justifyContent: 'center', gap: '32px' }}>
        {/* Header */}
        <div className="text-center flex flex-col items-center gap-4">
          <span className="inline-block py-1 px-3 bg-bg-card border-2 border-border-color text-[1.2rem] font-display text-text-primary uppercase shadow-retro-sm">
            MODE: {session.category.replace('_', ' ')}
          </span>
          <h2>
            {isActive ? (
              <span className="text-love">READY TO PLAY!</span>
            ) : needsToJoin ? (
              "PLAYER 2 INVITED"
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

        {/* Active - transitioning */}
        {isActive && (
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="spinner" />
            <p>LOADING...</p>
          </div>
        )}

        {/* Need to join */}
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

        {/* Host waiting - share section */}
        {isHost && isWaiting && (
          <>
            <div className="p-6 flex flex-col gap-4 bg-bg-card border-4 border-border-color shadow-retro">
              <p className="text-[1.2rem] font-display text-text-primary">INVITE LINK</p>
              <div className="p-3 bg-bg-secondary border-2 border-border-color overflow-x-auto shadow-input">
                <code className="text-base text-text-primary break-all">{shareLink}</code>
              </div>
              <div className="flex gap-2.5 flex-wrap justify-center">
                <button
                  id="copy-link-btn"
                  className="share-btn"
                  onClick={handleCopy}
                >
                  {copied ? 'COPIED!' : 'COPY'}
                </button>
                <button
                  id="share-whatsapp-btn"
                  className="share-btn whatsapp"
                  onClick={handleShareWhatsApp}
                >
                  WHATSAPP
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-5 mt-6">
              <div className="pulseRing" />
              <p className="waiting-dots text-text-secondary text-[1.2rem] font-display">
                AWAITING CONNECTION<span>.</span><span>.</span><span>.</span>
              </p>
            </div>
          </>
        )}

        {/* Already joined, waiting for redirect */}
        {playerInfo && !isHost && isWaiting && (
          <div className="flex flex-col items-center gap-5 mt-6">
            <div className="pulseRing" />
            <p className="waiting-dots text-text-secondary text-[1.2rem] font-display">WAITING FOR HOST<span>.</span><span>.</span><span>.</span></p>
          </div>
        )}
      </div>

      {/* Toast */}
      <div className={`toast ${copied ? 'show' : ''}`}>
        LINK COPIED
      </div>
    </main>
  );
}
