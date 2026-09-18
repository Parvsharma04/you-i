import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { useGameSocket } from '@/hooks/useGameSocket';
import { maskPlayerId } from '@/lib/mask-player-id';
import { getActiveSession, type SessionRecord } from '@/lib/storage';

function statusColor(status: string): string {
  switch (status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
      return 'bg-yellow-400';
    case 'reconnecting':
      return 'bg-orange-500';
    default:
      return 'bg-red-500';
  }
}

export default function SocketDebugScreen() {
  const [record, setRecord] = useState<SessionRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    getActiveSession().then((next) => {
      if (!cancelled) setRecord(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    status,
    state,
    error,
    events,
    forcedBackground,
    forceDisconnect,
    forceBackground,
    refresh,
  } = useGameSocket(record?.sessionId ?? null, record?.playerId ?? null);

  return (
    <Screen>
      <ScrollView
        contentContainerClassName="p-5 pb-15"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="display-xl">Socket Debug</Text>
        <Text variant="body-sm" color="secondary">
          apps/mobile/src/features/debug/socket-screen.tsx
        </Text>

        <View className="mt-6 flex-row items-center gap-3">
          <View className={`h-4 w-4 rounded-full ${statusColor(status)}`} />
          <Text variant="display-md" className="uppercase">
            {status}
          </Text>
          {forcedBackground && (
            <Text variant="body-xs" color="muted">
              (forced background)
            </Text>
          )}
        </View>

        {record ? (
          <Card className="mt-6">
            <Text variant="body-sm" color="secondary">
              Active session
            </Text>
            <Text variant="body" className="mt-1">
              {record.sessionId}
            </Text>
            <Text variant="body-sm" color="secondary" className="mt-3">
              Player
            </Text>
            <Text variant="body" className="mt-1">
              {maskPlayerId(record.playerId)} ({record.role})
            </Text>
          </Card>
        ) : (
          <Card className="mt-6">
            <Text color="muted">No active session in secure storage.</Text>
          </Card>
        )}

        {error && (
          <Card className="mt-4" shadowSize="sm">
            <Text color="accent" variant="body-sm">
              Rehydration error
            </Text>
            <Text variant="body-xs" color="secondary" className="mt-1">
              {error.message}
            </Text>
          </Card>
        )}

        {state && (
          <Card className="mt-4" shadowSize="sm">
            <Text variant="body-sm" color="secondary">
              Last state
            </Text>
            <Text variant="body-xs" className="mt-1">
              status: {state.session.status}
            </Text>
            <Text variant="body-xs">
              partner joined: {state.partner.joined ? 'yes' : 'no'}
            </Text>
            <Text variant="body-xs">
              you answered: {state.you.answeredQuestionIds.length} /{' '}
              {state.questions.length}
            </Text>
            <Text variant="body-xs">
              partner answered: {state.partner.answeredQuestionIds.length} /{' '}
              {state.questions.length}
            </Text>
          </Card>
        )}

        <View className="mt-6 flex-row flex-wrap gap-3">
          <Button title="Force disconnect" onPress={forceDisconnect} />
          <Button
            title={forcedBackground ? 'Clear background' : 'Force background'}
            onPress={forceBackground}
          />
          <Button title="Refresh state" onPress={refresh} />
        </View>

        <Text variant="display-md" className="mt-8">
          Last {events.length} events
        </Text>
        <View className="mt-3 gap-3">
          {events.length === 0 && <Text color="muted">No events yet.</Text>}
          {[...events].reverse().map((entry) => (
            <Card key={entry.id} shadowSize="sm">
              <View className="flex-row justify-between">
                <Text variant="body-sm" bold>
                  {entry.name}
                </Text>
                <Text variant="body-xs" color="muted">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              {entry.payload !== undefined && (
                <Text variant="body-xs" color="secondary" className="mt-1">
                  {JSON.stringify(entry.payload)}
                </Text>
              )}
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
