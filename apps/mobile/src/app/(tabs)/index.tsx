import { ErrorBoundary } from '@/components/error-boundary';
import HomeScreen from '@/features/home/home-screen';

export default function HomeRoute() {
  return (
    <ErrorBoundary context={{ route: 'home' }}>
      <HomeScreen />
    </ErrorBoundary>
  );
}
