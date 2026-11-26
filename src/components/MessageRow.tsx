// One row in an inbox. Unread messages are bold; read ones are muted.
import React from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import type { Message } from '../types';
import { formatDateTime } from '../utils/time';
import { Colors, Radius, Spacing, TypeScale } from '../constants/tokens';

export function MessageRow(props: { message: Message; onOpen: () => void }) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const { message } = props;
  return (
    <Pressable
      onPress={props.onOpen}
      accessibilityLabel={`Open message from ${message.fromAddress}: ${message.subject}`}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.dotRow}>
        <View
          style={[
            styles.dot,
            { backgroundColor: message.isRead ? 'transparent' : c.primary },
          ]}
        />
        <Text
          style={[styles.from, { color: c.text, fontWeight: message.isRead ? '400' : '700' }]}
          numberOfLines={1}
        >
          {message.fromAddress}
        </Text>
        <Text style={[styles.time, { color: c.textMuted }]}>{formatDateTime(message.receivedAt)}</Text>
      </View>
      <Text
        style={[styles.subject, { color: c.text, fontWeight: message.isRead ? '400' : '600' }]}
        numberOfLines={1}
      >
        {message.subject || '(no subject)'}
      </Text>
      <Text style={[styles.preview, { color: c.textMuted }]} numberOfLines={2}>
        {message.bodyText}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.xs },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  from: { fontSize: TypeScale.body, flex: 1 },
  time: { fontSize: TypeScale.small },
  subject: { fontSize: TypeScale.body },
  preview: { fontSize: TypeScale.small, lineHeight: 18 },
});
