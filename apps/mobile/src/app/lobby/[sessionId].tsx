import { ErrorBoundary } from '@/components/error-boundary';
import LobbyScreen from '@/features/lobby/lobby-screen';

export default function LobbyRoute() {
  return (
    <ErrorBoundary context={{ route: 'lobby' }}>
      <LobbyScreen />
    </ErrorBoundary>
  );
}
