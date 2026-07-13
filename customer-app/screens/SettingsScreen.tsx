import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fadePressed, shadow } from '../constants/design';
import { colors, spacing } from '../constants/theme';
import type { FontFamilies } from '../types/fonts';
import { impactLight } from '../utils/haptics';

type Props = {
  fonts: FontFamilies;
  onBack: () => void;
  onLogOut: () => void;
};

const SUPPORT_EMAIL = 'support@salon-hub.com';

/** App settings — real, self-contained actions only (no stubbed toggles). */
export function SettingsScreen({ fonts, onBack, onLogOut }: Props) {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const Row = ({
    icon,
    label,
    onPress,
    danger,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    danger?: boolean;
  }) => (
    <Pressable
      onPress={() => {
        impactLight();
        onPress();
      }}
      style={({ pressed }) => [styles.row, fadePressed(pressed)]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.error : colors.accent} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, { fontFamily: fonts.semibold }, danger && { color: colors.error }]}>{label}</Text>
      {!danger && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              impactLight();
              onBack();
            }}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, fadePressed(pressed)]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { fontFamily: fonts.bold }]}>App settings</Text>
        </View>

        <View style={styles.card}>
          <Row
            icon="mail-outline"
            label="Contact support"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Salon%20Hub%20support`).catch(() => {})}
          />
          <View style={styles.divider} />
          <Row icon="log-out-outline" label="Log out" onPress={onLogOut} danger />
        </View>

        <Text style={[styles.version, { fontFamily: fonts.regular }]}>Version {version}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.screenHorizontal },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    ...shadow.card,
  },
  title: { fontSize: 24, color: colors.text },
  card: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 12, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rowIcon: { marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 16, color: colors.text },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  version: { textAlign: 'center', fontSize: 13, color: colors.textMuted, marginTop: 24 },
});
