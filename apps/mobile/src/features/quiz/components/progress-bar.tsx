import { View } from 'react-native';

import { Text } from '@/components/ui/text';

type ProgressBarProps = {
  label: string;
  progress: number;
  total: number;
  variant?: 'you' | 'partner';
};

export function ProgressBar({
  label,
  progress,
  total,
  variant = 'you',
}: ProgressBarProps) {
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
  const fillColor = variant === 'you' ? 'bg-accent' : 'bg-text-muted';

  return (
    <View className="flex-row items-center gap-3">
      <Text variant="body-xs" bold color="muted" className="w-10">
        {label}
      </Text>
      <View className="h-3 flex-1 border-2 border-border-color bg-bg-secondary">
        <View className={`h-full ${fillColor}`} style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
