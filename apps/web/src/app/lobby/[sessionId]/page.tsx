'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api, loadPlayerInfo, type SessionResponse } from '@/lib/api';
import LobbyBrowser from './lobby-browser';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.youandi.mobile';

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').toUpperCase();
}

export default function LobbyPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [error, setError] = useState('');
  const [inBrowser, setInBrowser] = useState(() => {
    // If this browser already has player state for the session, skip the
    // install pitch and go straight to the in-browser lobby.
    if (typeof window === 'undefined') return false;
    return loadPlayerInfo(sessionId) !== null;
  });

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sess = await api.getSession(sessionId);
        setSession(sess);
      } catch {
        setError('SESSION NOT FOUND');
      }
    };

    loadSession();
  }, [sessionId]);

  if (error) {
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

  if (inBrowser) {
    return <LobbyBrowser sessionId={sessionId} session={session} onLeave={() => setInBrowser(false)} />;
  }

  return (
    <main className="min-h-screen flex items-center">
      <div className="container-custom" style={{ justifyContent: 'center', gap: '32px' }}>
        <div className="text-center flex flex-col items-center gap-5 animate-fadeInUp">
          <span className="inline-block py-1 px-3 bg-bg-card border-2 border-border-color text-[1.2rem] font-display text-text-primary uppercase shadow-retro-sm">
            MODE: {formatCategory(session.category)}
          </span>

          <div>
            <h2 className="mb-2">YOU&apos;RE INVITED 💌</h2>
            <p className="text-text-secondary text-[1.1rem] font-display">
              {session.questionCount} stages · 2 players · retro compatibility
            </p>
          </div>

          <p className="text-text-primary text-base font-body max-w-[320px]">
            Player 1 is waiting in the lobby. Install the app to play together.
          </p>
        </div>

        <div className="flex flex-col gap-4 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-center"
            style={{ width: '100%', padding: '16px' }}
          >
            GET THE APP
          </a>

          <button
            className="share-btn w-full justify-center"
            onClick={() => setInBrowser(true)}
          >
            CONTINUE IN BROWSER
          </button>
        </div>

        <p className="text-center text-text-muted text-sm font-body">
          If you already have the app installed, this link should have opened it automatically.
        </p>
      </div>
    </main>
  );
}
