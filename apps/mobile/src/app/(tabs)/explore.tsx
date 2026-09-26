import { ErrorBoundary } from '@/components/error-boundary';
import ExploreScreen from '@/features/explore/explore-screen';

export default function ExploreRoute() {
  return (
    <ErrorBoundary context={{ route: 'explore' }}>
      <ExploreScreen />
    </ErrorBoundary>
  );
}
