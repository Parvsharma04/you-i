import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { ProgressBar } from './progress-bar';

type WaitingViewProps = {
  partnerProgress: number;
  total: number;
  pendingCount: number;
  socketStatus: string;
};

export function WaitingView({
  partnerProgress,
  total,
  pendingCount,
  socketStatus,
}: WaitingViewProps) {
  const connectionLabel = (() => {
    switch (socketStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting…';
      case 'reconnecting':
        return 'Reconnecting…';
      default:
        return 'Offline — checking…';
    }
  })();

  return (
    <View className="flex-1 items-center justify-center gap-6 px-6 py-8">
      <Card className="w-full items-center gap-5">
        <Text variant="display-xl" color="accent">
          ^__^
        </Text>
        <Text variant="display-md" color="primary" className="text-center">
          STAGE CLEAR
        </Text>
        <Text
          variant="body"
          color="secondary"
          className="text-center"
        >{`AWAITING P2${'…'}`}</Text>

        <View className="w-full gap-2">
          <ProgressBar
            label="P2"
            progress={partnerProgress}
            total={total}
            variant="partner"
          />
          <Text variant="body-xs" color="muted" className="text-center">
            {partnerProgress}/{total} answered
          </Text>
        </View>

        {pendingCount > 0 && (
          <Text variant="body-sm" color="accent" className="text-center">
            {pendingCount} answer{pendingCount === 1 ? '' : 's'} queued — will
            sync when back online
          </Text>
        )}

        <Text variant="body-xs" color="muted">
          {connectionLabel}
        </Text>
      </Card>
    </View>
  );
}
