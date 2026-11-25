// Read one message.
// Shows sender, subject, received time, and the body as text by default.
// If the message has sanitized HTML, the cleaned text of it is shown —
// never the raw HTML, never with scripts, and never loading remote content,
// so opening a message makes no network requests (FR-06).
// Distinctive feature: if the text contains a verification code, a
// "Copy code" button appears. The code is detected locally, shown only to
// the user, and never sent anywhere.
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { getDatabase } from '../../src/db/database';
import {
  deleteMessage,
  getMessage,
  markMessageRead,
} from '../../src/db/repositories/messageRepository';
import { extractVerificationCode } from '../../src/features/verification/extractCode';
import { htmlToText } from '../../src/utils/sanitizeHtml';
import { formatDateTime } from '../../src/utils/time';
import type { Message } from '../../src/types';
import { PrimaryButton } from '../../src/components/ui';
import { Colors, Spacing, TypeScale } from '../../src/constants/tokens';

export default function MessageScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const messageId = Number(id);
  const router = useRouter();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const [message, setMessage] = useState<Message | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      const loaded = await getMessage(db, messageId);
      if (!loaded) return;
      setMessage(loaded);
      setCode(extractVerificationCode(loaded.bodyText));
      // Opening a message marks it read (FR-11).
      if (!loaded.isRead) await markMessageRead(db, messageId, true);
    })();
  }, [messageId]);

  if (!message) {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <Text style={{ color: c.textMuted }}>Loading message…</Text>
      </View>
    );
  }

  // Text by default; cleaned HTML is converted to plain text as well.
  const body = message.bodyHtmlClean ? htmlToText(message.bodyHtmlClean) : message.bodyText;

  const copyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
  };

  const confirmDelete = () => {
    Alert.alert('Delete this message?', 'The message will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const db = await getDatabase();
          await deleteMessage(db, messageId);
          router.back();
        },
      },
    ]);
  };

  const toggleRead = async () => {
    const db = await getDatabase();
    await markMessageRead(db, messageId, !message.isRead);
    setMessage({ ...message, isRead: !message.isRead });
  };

  return (
    <ScrollView style={[styles.root, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.subject, { color: c.text }]}>{message.subject || '(no subject)'}</Text>
      <Text style={[styles.meta, { color: c.textMuted }]}>From: {message.fromAddress}</Text>
      <Text style={[styles.meta, { color: c.textMuted }]}>Received: {formatDateTime(message.receivedAt)}</Text>

      {code ? (
        <View style={[styles.codeCard, { backgroundColor: c.surface, borderColor: c.primary }]}>
          <Text style={[styles.codeLabel, { color: c.text }]}>Verification code</Text>
          <Text style={[styles.code, { color: c.primary }]}>{code}</Text>
          <PrimaryButton
            label={copied ? 'Copied!' : 'Copy code'}
            onPress={copyCode}
            accessibilityLabel="Copy verification code"
          />
          <Text style={[styles.codeNote, { color: c.textMuted }]}>
            Shown only to you. It is not sent anywhere.
          </Text>
        </View>
      ) : null}

      <Text style={[styles.body, { color: c.text }]} selectable>
        {body || '(This message has no text.)'}
      </Text>

      <View style={styles.actions}>
        <PrimaryButton
          label={message.isRead ? 'Mark as unread' : 'Mark as read'}
          onPress={toggleRead}
          accessibilityLabel={message.isRead ? 'Mark as unread' : 'Mark as read'}
        />
        <PrimaryButton label="Delete message" onPress={confirmDelete} danger accessibilityLabel="Delete message" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md },
  subject: { fontSize: TypeScale.title, fontWeight: '700' },
  meta: { fontSize: TypeScale.small },
  codeCard: { borderWidth: 1, borderRadius: 12, padding: Spacing.lg, gap: Spacing.sm, alignItems: 'center' },
  codeLabel: { fontSize: TypeScale.small, fontWeight: '600' },
  code: { fontSize: 32, fontWeight: '700', letterSpacing: 4 },
  codeNote: { fontSize: TypeScale.small, textAlign: 'center' },
  body: { fontSize: TypeScale.body, lineHeight: 24 },
  actions: { gap: Spacing.md, marginTop: Spacing.md },
});
