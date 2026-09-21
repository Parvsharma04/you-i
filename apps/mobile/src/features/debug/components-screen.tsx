import { useState } from 'react';
import { View } from 'react-native';

import {
  BottomSheet,
  Button,
  Card,
  CategoryTile,
  CodeInput,
  OptionTile,
  ProgressPair,
  Screen,
  ScoreVenn,
  SpicyCategoryTile,
  Text,
} from '@/components/ui';

export default function ComponentsDebugScreen() {
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <Screen
      scroll
      scrollViewProps={{ contentContainerStyle: { padding: 22, gap: 22 } }}
    >
      <Text variant="display-xl">UI components</Text>
      <Text variant="body" color="secondary">
        Token and motion smoke test. Paste a six-character code into the first
        box.
      </Text>

      <Card>
        <Text variant="title">Typography</Text>
        <Text variant="display">Display</Text>
        <Text variant="title">Title</Text>
        <Text variant="body">Body and Figtree</Text>
        <Text variant="label">Label</Text>
        <Text variant="mono">MONO 0123</Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Button title="Primary" onPress={() => undefined} />
        <Button
          title="Secondary"
          variant="secondary"
          onPress={() => undefined}
        />
      </View>
      <Button title="Pending width lock" pending onPress={() => undefined} />

      <CodeInput value={code} onChange={setCode} onComplete={setCode} />
      <OptionTile
        label="Selected ink state"
        emoji="💬"
        selected={selected}
        onPress={() => setSelected((value) => !value)}
      />
      <OptionTile label="Correct alignment" emoji="✓" correct />
      <ProgressPair yours={3} theirs={2} />
      <CategoryTile
        name="Deep talk"
        emoji="🌌"
        description="Go beneath the surface"
      />
      <SpicyCategoryTile
        name="Spicy"
        emoji="🌶️"
        description="Turn up the heat"
      />
      <ScoreVenn score={78} />
      <Button
        title="Open bottom sheet"
        onPress={() => setSheetVisible(true)}
        fullWidth
      />
      <BottomSheet
        visible={sheetVisible}
        onDismiss={() => setSheetVisible(false)}
      >
        <Text variant="title">Drag me down</Text>
        <Text variant="body" color="secondary">
          This sheet dismisses with a real pan gesture.
        </Text>
      </BottomSheet>
    </Screen>
  );
}
