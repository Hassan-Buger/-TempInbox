// Reusable UI components. All of them read the design tokens and use a
// minimum 48 dp touch target. Every button has an accessibility label.
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Colors, MinTouchTarget, Radius, Spacing, TypeScale } from '../constants/tokens';

type Scheme = 'light' | 'dark';
function useScheme(): Scheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  accessibilityLabel?: string;
}) {
  const scheme = useScheme();
  const c = Colors[scheme];
  return (
    <TouchableOpacity
      onPress={props.onPress}
      disabled={props.disabled || props.loading}
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      accessibilityRole="button"
      style={[
        styles.button,
        { backgroundColor: props.danger ? c.danger : c.primary, opacity: props.disabled ? 0.5 : 1 },
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={props.danger ? '#FFFFFF' : c.primaryText} />
      ) : (
        <Text style={[styles.buttonText, { color: props.danger ? '#FFFFFF' : c.primaryText }]}>
          {props.label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function IconButton(props: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const scheme = useScheme();
  const c = Colors[scheme];
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityLabel={props.label}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: pressed ? c.surfaceMuted : c.surface, borderColor: c.border },
      ]}
    >
      {props.children}
    </Pressable>
  );
}

export function EmptyState(props: { title: string; body: string }) {
  const scheme = useScheme();
  const c = Colors[scheme];
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: c.text }]}>{props.title}</Text>
      <Text style={[styles.emptyBody, { color: c.textMuted }]}>{props.body}</Text>
    </View>
  );
}

export function ErrorState(props: { message: string; onRetry?: () => void }) {
  const scheme = useScheme();
  const c = Colors[scheme];
  return (
    <View style={[styles.error, { backgroundColor: c.surface, borderColor: c.danger }]}>
      <Text style={[styles.errorText, { color: c.danger }]}>{props.message}</Text>
      {props.onRetry ? (
        <PrimaryButton label="Try again" onPress={props.onRetry} accessibilityLabel="Try again" />
      ) : null}
    </View>
  );
}

export function CountdownBadge(props: { text: string; expired: boolean }) {
  const scheme = useScheme();
  const c = Colors[scheme];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: props.expired ? c.surfaceMuted : c.surface,
          borderColor: props.expired ? c.border : c.primary,
        },
      ]}
    >
      <Text style={{ color: props.expired ? c.expired : c.primary, fontSize: TypeScale.small, fontWeight: '600' }}>
        {props.expired ? 'Expired' : `Expires in ${props.text}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MinTouchTarget,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: TypeScale.body, fontWeight: '600' },
  iconButton: {
    minWidth: MinTouchTarget,
    minHeight: MinTouchTarget,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  empty: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  emptyTitle: { fontSize: TypeScale.subtitle, fontWeight: '600', textAlign: 'center' },
  emptyBody: { fontSize: TypeScale.body, textAlign: 'center', lineHeight: 22 },
  error: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.lg, gap: Spacing.md },
  errorText: { fontSize: TypeScale.body, lineHeight: 22 },
  badge: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
});
