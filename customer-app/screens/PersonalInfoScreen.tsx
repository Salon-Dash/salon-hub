import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fadePressed, shadow } from '../constants/design';
import { colors, spacing } from '../constants/theme';
import type { FontFamilies } from '../types/fonts';
import { impactLight } from '../utils/haptics';

type Props = {
  fonts: FontFamilies;
  name: string;
  email: string;
  onBack: () => void;
};

/** Read-only view of the signed-in customer's account details. */
export function PersonalInfoScreen({ fonts, name, email, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'person-outline', label: 'Name', value: name || '—' },
    { icon: 'mail-outline', label: 'Email', value: email || '—' },
  ];

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
          <Text style={[styles.title, { fontFamily: fonts.bold }]}>Personal info</Text>
        </View>

        <View style={styles.card}>
          {rows.map((r, i) => (
            <View key={r.label} style={[styles.row, i > 0 && styles.rowDivider]}>
              <Ionicons name={r.icon} size={20} color={colors.accent} style={styles.rowIcon} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { fontFamily: fonts.regular }]}>{r.label}</Text>
                <Text style={[styles.rowValue, { fontFamily: fonts.semibold }]}>{r.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.note, { fontFamily: fonts.regular }]}>
          To change your details, contact support for now — in-app editing is coming soon.
        </Text>
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
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 6, ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowIcon: { marginRight: 14 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  rowValue: { fontSize: 16, color: colors.text },
  note: { fontSize: 13, color: colors.textMuted, marginTop: 18, paddingHorizontal: 6, lineHeight: 19 },
});
