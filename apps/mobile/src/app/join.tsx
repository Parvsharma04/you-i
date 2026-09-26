import { ErrorBoundary } from '@/components/error-boundary';
import JoinScreen from '@/features/join/join-screen';

export default function JoinRoute() {
  return (
    <ErrorBoundary context={{ route: 'join' }}>
      <JoinScreen />
    </ErrorBoundary>
  );
}
