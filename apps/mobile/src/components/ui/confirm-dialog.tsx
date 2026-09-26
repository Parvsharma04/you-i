import { Modal, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Button } from './button';
import { Card } from './card';
import { Text } from './text';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  style?: ViewStyle;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  style,
}: ConfirmDialogProps) {
  const theme = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: `${theme.ink}66` }}
      >
        <Card style={[{ width: '100%', gap: 16 }, style]}>
          <Text variant="title" bold>
            {title}
          </Text>
          <Text variant="body" color="secondary">
            {message}
          </Text>
          <View className="gap-3">
            <Button title={confirmLabel} onPress={onConfirm} fullWidth />
            <Button
              title="CANCEL"
              variant="secondary"
              onPress={onCancel}
              fullWidth
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
