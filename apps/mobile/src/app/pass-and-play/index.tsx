import { ErrorBoundary } from '@/components/error-boundary';
import PassAndPlaySetupScreen from '@/features/pass-and-play/setup-screen';

export default function PassAndPlaySetupRoute() {
  return (
    <ErrorBoundary context={{ route: 'pass-and-play-setup' }}>
      <PassAndPlaySetupScreen />
    </ErrorBoundary>
  );
}
