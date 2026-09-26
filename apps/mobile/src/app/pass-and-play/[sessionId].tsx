import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingView } from '@/components/loading-view';
import { Screen } from '@/components/ui/screen';
import PassAndPlayScreen from '@/features/pass-and-play/pass-and-play-screen';
import { getSession, type SessionRecord } from '@/lib/storage';

function PassAndPlayRouteInner() {
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
      if (!stored || !stored.passAndPlay) {
        router.replace('/');
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

  return <PassAndPlayScreen sessionId={sessionId} record={record} />;
}

export default function PassAndPlayRoute() {
  return (
    <ErrorBoundary context={{ route: 'pass-and-play' }}>
      <PassAndPlayRouteInner />
    </ErrorBoundary>
  );
}
