// First-launch onboarding: three short cards explaining what TempInbox does
// and what it does not do. Shown once; "Get started" records that and
// opens the Addresses tab.
import React, { useState } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getDatabase } from '../src/db/database';
import { setSetting, SETTING_KEYS } from '../src/db/repositories/settingsRepository';
import { PrimaryButton } from '../src/components/ui';
import { Colors, Spacing, TypeScale } from '../src/constants/tokens';

const CARDS = [
  {
    title: 'Disposable addresses',
    body: 'Create a temporary email address for a sign-up or a one-time verification, instead of giving away your real address.',
  },
  {
    title: 'Addresses expire',
    body: 'Every address has a visible countdown. When it expires it stops receiving mail, but its messages stay readable until you destroy it.',
  },
  {
    title: 'Mail stays on your device',
    body: 'Messages are stored in a database on this phone. There is no account, no ads, and no analytics — and nothing is sent anywhere.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    const db = await getDatabase();
    await setSetting(db, SETTING_KEYS.onboardingSeen, '1');
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <Text style={[styles.title, { color: c.text }]}>Welcome to TempInbox</Text>
      {CARDS.map((card) => (
        <View key={card.title} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{card.title}</Text>
          <Text style={[styles.cardBody, { color: c.textMuted }]}>{card.body}</Text>
        </View>
      ))}
      <PrimaryButton label="Get started" onPress={finish} loading={busy} accessibilityLabel="Get started" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: Spacing.xl, gap: Spacing.lg, justifyContent: 'center' },
  title: { fontSize: TypeScale.title, fontWeight: '700', textAlign: 'center', marginBottom: Spacing.sm },
  card: { borderWidth: 1, borderRadius: 12, padding: Spacing.lg, gap: Spacing.xs },
  cardTitle: { fontSize: TypeScale.subtitle, fontWeight: '600' },
  cardBody: { fontSize: TypeScale.body, lineHeight: 22 },
});
