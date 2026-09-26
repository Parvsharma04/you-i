import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingView } from '@/components/loading-view';
import { Screen } from '@/components/ui/screen';
import { QuizScreen } from '@/features/quiz/quiz-screen';
import { getSession, type SessionRecord } from '@/lib/storage';

function QuizRouteInner() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<{ sessionId: string }>();
  const sessionId = Array.isArray(rawParams.sessionId)
    ? rawParams.sessionId[0]
    : rawParams.sessionId;

  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;
    getSession(sessionId).then((stored) => {
      if (!mounted) return;
      if (!stored) {
        router.replace(`/lobby/${sessionId}`);
        return;
      }
      if (stored.passAndPlay) {
        router.replace(`/pass-and-play/${sessionId}`);
        return;
      }
      setRecord(stored);
      setChecking(false);
    });

    return () => {
      mounted = false;
    };
  }, [sessionId, router]);

  if (!sessionId || checking) {
    return (
      <Screen>
        <LoadingView
          title="LOADING GAME…"
          subtitle="Finding your saved session."
        />
      </Screen>
    );
  }

  if (!record) {
    return null;
  }

  return (
    <QuizScreen
      sessionId={sessionId}
      playerId={record.playerId}
      partnerName={
        record.role === 'player1'
          ? (record.player2Name ?? 'Your partner')
          : (record.player1Name ?? 'Your partner')
      }
    />
  );
}

export default function QuizRoute() {
  return (
    <ErrorBoundary context={{ route: 'quiz' }}>
      <QuizRouteInner />
    </ErrorBoundary>
  );
}
