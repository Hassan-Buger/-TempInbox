// Root layout: opens the database once (foreign keys + migrations), then
// decides whether to show onboarding (first launch) or the main tabs.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { getDatabase } from '../src/db/database';
import { getSetting } from '../src/db/repositories/settingsRepository';
import { SETTING_KEYS } from '../src/db/repositories/settingsRepository';
import { Colors } from '../src/constants/tokens';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];

  useEffect(() => {
    (async () => {
      try {
        const db = await getDatabase();
        const seen = await getSetting(db, SETTING_KEYS.onboardingSeen);
        setOnboardingSeen(seen === '1');
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Database failed to open.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready || onboardingSeen === null) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!onboardingSeen && !inOnboarding) router.replace('/onboarding');
    if (onboardingSeen && inOnboarding) router.replace('/(tabs)');
  }, [ready, onboardingSeen, segments]);

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.danger }}>Could not open the database: {error}</Text>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="address/[id]" options={{ headerShown: true, title: 'Inbox' }} />
      <Stack.Screen name="message/[id]" options={{ headerShown: true, title: 'Message' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
