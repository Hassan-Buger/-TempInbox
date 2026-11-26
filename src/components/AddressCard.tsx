// One row in the Addresses list. Shows the address, its live countdown,
// status, and how many messages (and unread ones) it has. Tapping opens
// the inbox; the Destroy button asks for confirmation first.
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import type { Mailbox } from '../types';
import { formatCountdown, isExpired } from '../utils/time';
import { Colors, Radius, Spacing, TypeScale } from '../constants/tokens';
import { CountdownBadge } from './ui';

export function AddressCard(props: {
  mailbox: Mailbox;
  now: number;
  onOpen: () => void;
  onDestroy: () => void;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const { mailbox, now } = props;
  const expired = mailbox.status === 'expired' || isExpired(mailbox.expiresAt, now);

  const confirmDestroy = () => {
    Alert.alert(
      'Destroy address?',
      `This deletes ${mailbox.address} and all its messages from this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Destroy', style: 'destructive', onPress: props.onDestroy },
      ],
    );
  };

  return (
    <Pressable
      onPress={props.onOpen}
      accessibilityLabel={`Open inbox for ${mailbox.address}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.address, { color: c.text }]} numberOfLines={1}>
          {mailbox.address}
        </Text>
        {mailbox.unreadCount ? (
          <View style={[styles.unread, { backgroundColor: c.primary }]}>
            <Text style={[styles.unreadText, { color: c.primaryText }]}>{mailbox.unreadCount}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.row}>
        <CountdownBadge text={formatCountdown(mailbox.expiresAt - now)} expired={expired} />
        <Text style={[styles.count, { color: c.textMuted }]}>
          {mailbox.messageCount ?? 0} message{(mailbox.messageCount ?? 0) === 1 ? '' : 's'}
        </Text>
      </View>
      <Pressable
        onPress={confirmDestroy}
        accessibilityLabel={`Destroy address ${mailbox.address}`}
        accessibilityRole="button"
        style={styles.destroy}
      >
        <Text style={[styles.destroyText, { color: c.danger }]}>Destroy</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  address: { fontSize: TypeScale.body, fontWeight: '600', flex: 1 },
  count: { fontSize: TypeScale.small },
  unread: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: TypeScale.small, fontWeight: '700' },
  destroy: { alignSelf: 'flex-start', paddingVertical: Spacing.xs, minHeight: 32, justifyContent: 'center' },
  destroyText: { fontSize: TypeScale.small, fontWeight: '600' },
});
