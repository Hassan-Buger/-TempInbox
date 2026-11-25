// Settings tab.
//  - Default expiry (10 min / 1 hour / 24 hours) — applies to new addresses only.
//  - Provider configuration form (react-hook-form + Zod): base URL and the
//    four endpoint paths the owner's provider uses, plus an optional API key.
//    Saved into the on-device settings table — never into git. Until all
//    five fields are present the app stays in "Provider not configured".
//  - Clear all data (with confirmation).
//  - Privacy notes.
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { getDatabase } from '../../src/db/database';
import {
  getDefaultExpiryMinutes,
  getSetting,
  setSetting,
  SETTING_KEYS,
} from '../../src/db/repositories/settingsRepository';
import { clearAllData } from '../../src/db/repositories/messageRepository';
import { getProviderConfig } from '../../src/providers/configuredProvider';
import { EXPIRY_OPTIONS } from '../../src/types';
import { PrimaryButton } from '../../src/components/ui';
import { Colors, Spacing, TypeScale } from '../../src/constants/tokens';

const providerSchema = z.object({
  baseUrl: z.string().trim().url('Enter a valid URL, e.g. https://mail.example.com'),
  apiKey: z.string().trim(),
  createPath: z.string().trim().min(1, 'Required — e.g. /addresses'),
  listPath: z.string().trim().min(1, 'Required — use {address} where the address goes'),
  getPath: z.string().trim().min(1, 'Required — use {address} and {id}'),
  deletePath: z.string().trim().min(1, 'Required — use {ref} where the provider id goes'),
});

type ProviderForm = z.infer<typeof providerSchema>;

export default function SettingsScreen() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const [expiry, setExpiry] = useState(10);
  const [configured, setConfigured] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState } = useForm<ProviderForm>({
    defaultValues: { baseUrl: '', apiKey: '', createPath: '', listPath: '', getPath: '', deletePath: '' },
  });

  useEffect(() => {
    (async () => {
      const db = await getDatabase();
      setExpiry(await getDefaultExpiryMinutes(db));
      setConfigured((await getProviderConfig(db)) !== null);
      const values: Partial<ProviderForm> = {};
      for (const [field, key] of [
        ['baseUrl', SETTING_KEYS.providerBaseUrl],
        ['apiKey', SETTING_KEYS.providerApiKey],
        ['createPath', SETTING_KEYS.providerCreatePath],
        ['listPath', SETTING_KEYS.providerListPath],
        ['getPath', SETTING_KEYS.providerGetPath],
        ['deletePath', SETTING_KEYS.providerDeletePath],
      ] as const) {
        values[field] = (await getSetting(db, key)) ?? '';
      }
      reset(values as ProviderForm);
    })();
  }, [reset]);

  const saveExpiry = async (minutes: number) => {
    setExpiry(minutes);
    const db = await getDatabase();
    await setSetting(db, SETTING_KEYS.defaultExpiryMinutes, String(minutes));
  };

  const saveProvider = async (data: ProviderForm) => {
    setFormError(null);
    const parsed = providerSchema.safeParse(data);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
      return;
    }
    const db = await getDatabase();
    await setSetting(db, SETTING_KEYS.providerBaseUrl, parsed.data.baseUrl);
    await setSetting(db, SETTING_KEYS.providerApiKey, parsed.data.apiKey);
    await setSetting(db, SETTING_KEYS.providerCreatePath, parsed.data.createPath);
    await setSetting(db, SETTING_KEYS.providerListPath, parsed.data.listPath);
    await setSetting(db, SETTING_KEYS.providerGetPath, parsed.data.getPath);
    await setSetting(db, SETTING_KEYS.providerDeletePath, parsed.data.deletePath);
    setConfigured(true);
    setSaved(true);
  };

  const clearProvider = async () => {
    const db = await getDatabase();
    for (const key of [
      SETTING_KEYS.providerBaseUrl,
      SETTING_KEYS.providerApiKey,
      SETTING_KEYS.providerCreatePath,
      SETTING_KEYS.providerListPath,
      SETTING_KEYS.providerGetPath,
      SETTING_KEYS.providerDeletePath,
    ]) {
      await setSetting(db, key, '');
    }
    reset({ baseUrl: '', apiKey: '', createPath: '', listPath: '', getPath: '', deletePath: '' });
    setConfigured(false);
    setSaved(false);
  };

  const clearAll = () => {
    Alert.alert(
      'Clear all data?',
      'This deletes every address and every message from this device. Settings are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: async () => {
            const db = await getDatabase();
            await clearAllData(db);
            Alert.alert('Done', 'All addresses and messages were deleted.');
          },
        },
      ],
    );
  };

  const field = (name: keyof ProviderForm, label: string, placeholder: string, secure = false) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={c.textMuted}
            secureTextEntry={secure}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={label}
            style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
          />
        )}
      />
      {formState.errors[name] ? (
        <Text style={[styles.fieldError, { color: c.danger }]}>{formState.errors[name]?.message}</Text>
      ) : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: c.text }]}>Settings</Text>

        <Text style={[styles.section, { color: c.text }]}>Provider status</Text>
        <Text style={[styles.body, { color: c.textMuted }]}>
          {configured
            ? 'A mail provider is configured. TempInbox will create addresses and fetch mail through it.'
            : 'Provider not configured — TempInbox cannot create real addresses or fetch mail yet. Fill in your provider below. Nothing is invented or faked.'}
        </Text>

        <Text style={[styles.section, { color: c.text }]}>Default expiry for new addresses</Text>
        <View style={styles.row}>
          {EXPIRY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.minutes}
              onPress={() => saveExpiry(option.minutes)}
              accessibilityLabel={`Default expiry ${option.label}`}
              accessibilityRole="button"
              style={[
                styles.chip,
                { borderColor: c.border, backgroundColor: expiry === option.minutes ? c.primary : c.surface },
              ]}
            >
              <Text style={{ color: expiry === option.minutes ? c.primaryText : c.text, fontWeight: '600' }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.section, { color: c.text }]}>Mail provider</Text>
        <Text style={[styles.body, { color: c.textMuted }]}>
          Enter the provider you want to use. The four paths are the endpoints your provider
          documents, with {'{address}'}, {'{id}'} and {'{ref}'} as placeholders. Saved only on
          this device.
        </Text>
        {field('baseUrl', 'Provider base URL', 'https://mail.example.com')}
        {field('apiKey', 'API key (optional)', 'Leave empty if your provider needs no key', true)}
        {field('createPath', 'Create address path', '/addresses')}
        {field('listPath', 'List messages path', '/addresses/{address}/messages')}
        {field('getPath', 'Get message path', '/addresses/{address}/messages/{id}')}
        {field('deletePath', 'Delete address path', '/addresses/{ref}')}
        {formError ? <Text style={[styles.fieldError, { color: c.danger }]}>{formError}</Text> : null}
        {saved ? <Text style={{ color: c.success }}>Provider saved.</Text> : null}
        <PrimaryButton label="Save provider" onPress={handleSubmit(saveProvider)} accessibilityLabel="Save provider" />
        {configured ? (
          <PrimaryButton label="Remove provider" onPress={clearProvider} danger accessibilityLabel="Remove provider" />
        ) : null}

        <Text style={[styles.section, { color: c.text }]}>Privacy</Text>
        <Text style={[styles.body, { color: c.textMuted }]}>
          No account, no ads, no analytics, no crash reporting. Mail is stored only on this
          device. HTML messages are shown as text by default and never load remote content.
          Verification codes are copied only when you tap — they are never sent anywhere.
        </Text>

        <Text style={[styles.section, { color: c.text }]}>Data</Text>
        <PrimaryButton label="Clear all data" onPress={clearAll} danger accessibilityLabel="Clear all data" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
  title: { fontSize: TypeScale.title, fontWeight: '700' },
  section: { fontSize: TypeScale.subtitle, fontWeight: '600', marginTop: Spacing.sm },
  body: { fontSize: TypeScale.body, lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, minHeight: 40, justifyContent: 'center' },
  field: { gap: Spacing.xs },
  label: { fontSize: TypeScale.small, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
    fontSize: TypeScale.body,
  },
  fieldError: { fontSize: TypeScale.small },
});
