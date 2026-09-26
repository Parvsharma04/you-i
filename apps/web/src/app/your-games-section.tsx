'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SESSION_STATUSES, type MySession } from '@youandi/shared';
import { api } from '@/lib/api';

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function statusLabel(session: MySession): string {
  const {
    status,
    passAndPlay,
    partnerJoined,
    yourAnswerCount,
    partnerAnswerCount,
    totalExpected,
  } = session;

  if (passAndPlay) {
    if (status === SESSION_STATUSES.ACTIVE) {
      const done = yourAnswerCount + partnerAnswerCount;
      return `Pass & play · ${done}/${totalExpected * 2}`;
    }
    if (status === SESSION_STATUSES.COMPLETED) {
      return 'Pass & play · Finished';
    }
  }

  if (status === SESSION_STATUSES.WAITING) {
    return partnerJoined ? 'Your turn' : 'Waiting for them';
  }

  if (status === SESSION_STATUSES.ACTIVE) {
    return yourAnswerCount < totalExpected
      ? 'Your turn'
      : 'Waiting for results';
  }

  if (status === SESSION_STATUSES.COMPLETED) {
    return 'Finished';
  }

  if (status === SESSION_STATUSES.EXPIRED) {
    return 'Expired';
  }

  return session.statusLabel;
}

function sessionPath(session: MySession): string | null {
  if (session.passAndPlay) {
    if (session.status === SESSION_STATUSES.ACTIVE) {
      return `/pass-and-play/${session.id}`;
    }
    if (session.status === SESSION_STATUSES.COMPLETED) {
      return `/results/${session.id}`;
    }
    return null;
  }

  if (session.status === SESSION_STATUSES.WAITING) {
    return `/lobby/${session.id}`;
  }
  if (session.status === SESSION_STATUSES.ACTIVE) {
    return `/quiz/${session.id}`;
  }
  if (session.status === SESSION_STATUSES.COMPLETED) {
    return `/results/${session.id}`;
  }
  return null;
}

export default function YourGamesSection() {
  const router = useRouter();
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    api.getMySessions()
      .then((games) => {
        if (!cancelled) setSessions(games);
      })
      .catch(() => {
        if (!cancelled) setError("COULDN'T LOAD YOUR GAMES.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section className="flex flex-col gap-3 mt-8">
        <h3 className="text-[1.2rem] font-display text-text-primary">YOUR GAMES:</h3>
        <p className="text-text-muted text-sm font-body">{error}</p>
      </section>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 mt-8">
      <h3 className="text-[1.2rem] font-display text-text-primary">YOUR GAMES:</h3>
      <div className="flex flex-col gap-3">
        {sessions.map((session) => {
          const path = sessionPath(session);
          const content = (
            <>
              <div>
                <p className="text-text-primary font-body font-bold">
                  {formatCategory(session.category)}
                </p>
                <p className="text-text-muted text-xs font-body">
                  {session.questionCount} questions · {session.role === 'player1' ? 'Host' : 'Player 2'}
                </p>
              </div>
              <span className="border-2 border-border-color bg-bg-secondary px-2 py-1 text-text-primary text-xs font-body font-bold">
                {statusLabel(session)}
              </span>
            </>
          );

          return path ? (
            <button
              key={session.id}
              className="w-full flex items-center justify-between gap-3 text-left bg-bg-card border-[3px] border-border-color shadow-retro p-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-retro-hover"
              onClick={() => router.push(path)}
              aria-label={`${formatCategory(session.category)} game, ${statusLabel(session)}`}
            >
              {content}
            </button>
          ) : (
            <div
              key={session.id}
              className="w-full flex items-center justify-between gap-3 bg-bg-card border-[3px] border-border-color shadow-retro p-4"
            >
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
