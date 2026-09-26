import { ErrorBoundary } from '@/components/error-boundary';
import PendingLobbyScreen from '@/features/lobby/pending-lobby-screen';

export default function PendingLobbyRoute() {
  return (
    <ErrorBoundary context={{ route: 'pending-lobby' }}>
      <PendingLobbyScreen />
    </ErrorBoundary>
  );
}
