// Inbox for one address.
// Shows the address (tap to copy), its live countdown, and its messages.
// Refresh (button or pull-to-refresh) fetches new mail through the provider
// — only while the address is active and a provider is configured. Fetched
// messages are stored in SQLite with deduplication, so they stay readable
// offline and a second fetch never stores the same message twice.
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { getDatabase } from '../../src/db/database';
import { expireOverdueMailboxes, getMailbox } from '../../src/db/repositories/addressRepository';
import {
  insertMessages,
  listMessagesForMailbox,
} from '../../src/db/repositories/messageRepository';
import { getProvider } from '../../src/providers/configuredProvider';
import { sanitizeHtml } from '../../src/utils/sanitizeHtml';
import { formatCountdown, isExpired } from '../../src/utils/time';
import type { Mailbox, Message } from '../../src/types';
import { MessageRow } from '../../src/components/MessageRow';
import { CountdownBadge, EmptyState, ErrorState, PrimaryButton } from '../../src/components/ui';
import { useNow } from '../../src/hooks/useNow';
import { Colors, Spacing, TypeScale } from '../../src/constants/tokens';

export default function AddressInboxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mailboxId = Number(id);
  const router = useRouter();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const now = useNow();
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = await getDatabase();
    await expireOverdueMailboxes(db, Date.now());
    setMailbox(await getMailbox(db, mailboxId));
    setMessages(await listMessagesForMailbox(db, mailboxId));
  }, [mailboxId]);

  useFocusEffect(
    useCallback(() => {
      load().catch((e) => setError(e instanceof Error ? e.message : 'Could not load the inbox.'));
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    setNotice(null);
    try {
      const db = await getDatabase();
      const box = await getMailbox(db, mailboxId);
      if (!box) throw new Error('Address not found.');
      if (box.status === 'expired' || isExpired(box.expiresAt)) {
        setNotice('This address has expired, so it no longer fetches mail. Its messages stay readable here.');
        await load();
        return;
      }
      const provider = await getProvider(db);
      if (!provider) {
        setNotice('Provider not configured — open Settings to add your mail provider.');
        return;
      }
      const fetched = await provider.listMessages(box.address);
      const added = await insertMessages(
        db,
        fetched.map((m) => ({
          mailboxId: box.id,
          providerMessageId: m.providerMessageId,
          fromAddress: m.fromAddress,
          subject: m.subject,
          receivedAt: m.receivedAt,
          bodyText: m.bodyText,
          bodyHtmlClean: m.bodyHtml ? sanitizeHtml(m.bodyHtml) : null,
        })),
      );
      setNotice(added === 0 ? 'No new messages.' : `${added} new message${added === 1 ? '' : 's'} received.`);
      await load();
    } catch (e) {
      // Provider failures show an error state and never crash the app.
      setError(e instanceof Error ? e.message : 'Refresh failed.');
    } finally {
      setRefreshing(false);
    }
  };

  if (!mailbox) {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <Text style={{ color: c.textMuted }}>Loading inbox…</Text>
      </View>
    );
  }

  const expired = mailbox.status === 'expired' || isExpired(mailbox.expiresAt, now);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <TouchableOpacity
        onPress={async () => Clipboard.setStringAsync(mailbox.address)}
        accessibilityLabel={`Copy address ${mailbox.address}`}
        accessibilityRole="button"
      >
        <Text style={[styles.address, { color: c.primary }]}>{mailbox.address} ⧉</Text>
      </TouchableOpacity>
      <CountdownBadge text={formatCountdown(mailbox.expiresAt - now)} expired={expired} />
      {notice ? <Text style={[styles.notice, { color: c.textMuted }]}>{notice}</Text> : null}
      {error ? <ErrorState message={error} onRetry={refresh} /> : null}
      <PrimaryButton
        label={refreshing ? 'Refreshing…' : 'Refresh inbox'}
        onPress={refresh}
        loading={refreshing}
        accessibilityLabel="Refresh inbox"
      />
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={
          <EmptyState
            title="No messages yet"
            body="Mail sent to this address will appear here. Pull down or tap Refresh to check for new mail."
          />
        }
        renderItem={({ item }) => (
          <MessageRow message={item} onOpen={() => router.push(`/message/${item.id}`)} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: Spacing.lg, gap: Spacing.md },
  address: { fontSize: TypeScale.subtitle, fontWeight: '600' },
  notice: { fontSize: TypeScale.body, lineHeight: 22 },
  list: { gap: Spacing.md, paddingVertical: Spacing.sm },
});
