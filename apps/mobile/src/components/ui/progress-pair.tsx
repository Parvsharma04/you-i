import { View } from 'react-native';

import { useTheme } from '@/theme';

export type ProgressPairProps = {
  yours: number;
  theirs: number;
  total?: number;
  accessibilityLabel?: string;
};

export function ProgressPair({
  yours,
  theirs,
  total = 5,
  accessibilityLabel = 'Answer progress',
}: ProgressPairProps) {
  const theme = useTheme();
  const track = (value: number, label: string) => (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${Math.min(value, total)} of ${total}`}
      style={{ flexDirection: 'row', gap: 6, minHeight: 12 }}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{
            height: 8,
            flex: 1,
            borderRadius: 4,
            backgroundColor: index < value ? theme.ink : theme.line,
          }}
        />
      ))}
    </View>
  );
  return (
    <View accessibilityLabel={accessibilityLabel} style={{ gap: 8 }}>
      {track(yours, 'Yours')}
      {track(theirs, 'Theirs')}
    </View>
  );
}
