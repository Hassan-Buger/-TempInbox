// Addresses tab — the home screen.
// Lists active and expired addresses (with a filter), each with a live
// countdown and message counts. "New address" asks the configured provider
// for an address and saves it; when no provider is configured, the button
// is replaced by an honest explanation and a link to Settings — the app
// never invents an address.
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { getDatabase } from '../../src/db/database';
import {
  createMailbox,
  deleteMailbox,
  expireOverdueMailboxes,
  listMailboxes,
} from '../../src/db/repositories/addressRepository';
import { getDefaultExpiryMinutes } from '../../src/db/repositories/settingsRepository';
import { getProvider } from '../../src/providers/configuredProvider';
import type { Mailbox } from '../../src/types';
import { expiryFromNow } from '../../src/utils/time';
import { AddressCard } from '../../src/components/AddressCard';
import { EmptyState, ErrorState, PrimaryButton } from '../../src/components/ui';
import { useUiStore, type AddressFilter } from '../../src/store/uiStore';
import { useNow } from '../../src/hooks/useNow';
import { Colors, Spacing, TypeScale } from '../../src/constants/tokens';

const FILTERS: { key: AddressFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expired', label: 'Expired' },
];

export default function AddressesScreen() {
  const router = useRouter();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const now = useNow();
  const { addressFilter, setAddressFilter, toast, showToast, clearToast } = useUiStore();
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const db = await getDatabase();
      await expireOverdueMailboxes(db, Date.now());
      setMailboxes(await listMailboxes(db));
      setProviderConfigured((await getProvider(db)) !== null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load addresses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Re-check expiry every tick so an address flips to "Expired" live.
  React.useEffect(() => {
    const timer = setInterval(() => {
      getDatabase()
        .then((db) => expireOverdueMailboxes(db, Date.now()))
        .catch(() => undefined);
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  const createAddress = async () => {
    setCreating(true);
    try {
      const db = await getDatabase();
      const provider = await getProvider(db);
      if (!provider) {
        Alert.alert(
          'Provider not configured',
          'Add your mail provider in Settings first. TempInbox never invents addresses.',
          [{ text: 'Open Settings', onPress: () => router.push('/(tabs)/settings') }, { text: 'Cancel', style: 'cancel' }],
        );
        return;
      }
      const created = await provider.createAddress();
      const minutes = await getDefaultExpiryMinutes(db);
      const nowMs = Date.now();
      await createMailbox(db, {
        address: created.address,
        providerRef: created.providerRef,
        createdAt: nowMs,
        expiresAt: expiryFromNow(minutes, nowMs),
      });
      showToast(`Address created — expires in ${minutes} minutes.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create an address.');
    } finally {
      setCreating(false);
    }
  };

  const copyAddress = async (address: string) => {
    await Clipboard.setStringAsync(address);
    showToast('Address copied to clipboard.');
  };

  const destroy = async (id: number) => {
    const db = await getDatabase();
    await deleteMailbox(db, id);
    showToast('Address destroyed.');
    await load();
  };

  const filtered =
    addressFilter === 'all'
      ? mailboxes
      : mailboxes.filter((m) => (addressFilter === 'active' ? m.status === 'active' : m.status === 'expired'));

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Text style={[styles.title, { color: c.text }]}>TempInbox</Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>Disposable addresses, on this device only.</Text>

      {toast ? (
        <TouchableOpacity onPress={clearToast} accessibilityLabel="Dismiss notification" style={[styles.toast, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ color: c.text }}>{toast}</Text>
        </TouchableOpacity>
      ) : null}

      {providerConfigured === false ? (
        <View style={[styles.notice, { backgroundColor: c.surface, borderColor: c.warning }]}>
          <Text style={[styles.noticeText, { color: c.text }]}>
            Provider not configured — TempInbox cannot create real addresses or fetch mail yet.
          </Text>
          <PrimaryButton label="Open Settings" onPress={() => router.push('/(tabs)/settings')} accessibilityLabel="Open Settings" />
        </View>
      ) : null}

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setAddressFilter(f.key)}
            accessibilityLabel={`Show ${f.label} addresses`}
            accessibilityRole="button"
            style={[
              styles.filter,
              { borderColor: c.border, backgroundColor: addressFilter === f.key ? c.primary : c.surface },
            ]}
          >
            <Text style={{ color: addressFilter === f.key ? c.primaryText : c.text, fontWeight: '600' }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <PrimaryButton
        label={creating ? 'Creating…' : 'New address'}
        onPress={createAddress}
        loading={creating}
        accessibilityLabel="Create a new temporary address"
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={
            loading
              ? () => null
              : () => (
                  <EmptyState
                    title="No addresses yet"
                    body="Tap “New address” to create your first disposable address. It will appear here with its expiry countdown."
                  />
                )
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <AddressCard
                mailbox={item}
                now={now}
                onOpen={() => router.push(`/address/${item.id}`)}
                onDestroy={() => destroy(item.id)}
              />
              <TouchableOpacity
                onPress={() => copyAddress(item.address)}
                accessibilityLabel={`Copy address ${item.address}`}
                accessibilityRole="button"
                style={[styles.copy, { borderColor: c.border, backgroundColor: c.surface }]}
              >
                <Text style={{ color: c.primary, fontWeight: '600' }}>Copy address</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: Spacing.lg, gap: Spacing.md },
  title: { fontSize: TypeScale.title, fontWeight: '700' },
  subtitle: { fontSize: TypeScale.body },
  toast: { borderWidth: 1, borderRadius: 8, padding: Spacing.md },
  notice: { borderWidth: 1, borderRadius: 12, padding: Spacing.lg, gap: Spacing.md },
  noticeText: { fontSize: TypeScale.body, lineHeight: 22 },
  filters: { flexDirection: 'row', gap: Spacing.sm },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, minHeight: 40, justifyContent: 'center' },
  list: { gap: Spacing.md, paddingVertical: Spacing.sm },
  cardWrap: { gap: Spacing.xs },
  copy: { borderWidth: 1, borderRadius: 8, paddingVertical: Spacing.sm, alignItems: 'center', minHeight: 40, justifyContent: 'center' },
});
