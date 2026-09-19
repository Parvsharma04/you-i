import { ErrorBoundary } from '@/components/error-boundary';
import CreateScreen from '@/features/create/create-screen';

export default function CreateRoute() {
  return (
    <ErrorBoundary context={{ route: 'create' }}>
      <CreateScreen />
    </ErrorBoundary>
  );
}
