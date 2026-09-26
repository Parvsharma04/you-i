import { useLocalSearchParams } from 'expo-router';

import { ErrorBoundary } from '@/components/error-boundary';
import JoinScreen from '@/features/join/join-screen';

export default function JoinDeepLinkRoute() {
  const params = useLocalSearchParams<{ code: string }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;

  return (
    <ErrorBoundary context={{ route: 'join-deep-link' }}>
      <JoinScreen initialCode={code ?? ''} autoSubmit />
    </ErrorBoundary>
  );
}
