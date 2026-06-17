import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fadePressed, shadow } from '../constants/design';
import { colors, spacing } from '../constants/theme';
import type { FontFamilies } from '../types/fonts';
import { impactLight } from '../utils/haptics';

type Props = {
  fonts: FontFamilies;
  onBack: () => void;
};

/** Matches profile wallet display (PLN, Polish decimals). */
const BALANCE_INT = '0';
const BALANCE_REST = ',00 PLN';

export function WalletScreen({ fonts, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom + 28;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => {
            impactLight();
            onBack();
          }}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, fadePressed(pressed)]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.pageTitle, { fontFamily: fonts.semibold }]}>Wallet</Text>
      </View>

      <View style={styles.heroWrap}>
        <LinearGradient
          colors={['#5b21b6', '#7c3aed', '#d946ef']}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={[styles.walletLabel, { fontFamily: fonts.regular }]}>Current balance</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.amountInt, { fontFamily: fonts.bold }]}>{BALANCE_INT}</Text>
            <Text style={[styles.amountRest, { fontFamily: fonts.bold }]}>{BALANCE_REST}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.giftBtn, fadePressed(pressed)]}
            onPress={() => impactLight()}
            accessibilityRole="button"
            accessibilityLabel="Add a gift card"
          >
            <Ionicons name="gift-outline" size={17} color="#fdf4ff" style={{ marginRight: 8 }} />
            <Text style={[styles.giftBtnText, { fontFamily: fonts.semibold }]}>Redeem gift card</Text>
          </Pressable>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { fontFamily: fonts.bold }]}>Payment methods</Text>

        <Pressable
          style={({ pressed }) => [styles.addCardRow, fadePressed(pressed)]}
          onPress={() => impactLight()}
          accessibilityRole="button"
          accessibilityLabel="Add debit or credit card"
        >
          <View style={styles.cardIconBox}>
            <Ionicons name="card-outline" size={22} color={colors.accent} />
            <View style={styles.plusBadge}>
              <Ionicons name="add" size={10} color={colors.accent} />
            </View>
          </View>
          <Text style={[styles.addCardLabel, { fontFamily: fonts.regular }]}>Add debit/credit card</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#7c3aed" style={{ marginRight: 8 }} />
          <Text style={[styles.infoText, { fontFamily: fonts.regular }]}>
            Your payment details are encrypted and securely stored.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  topBar: {
    paddingHorizontal: spacing.screenHorizontal,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pageTitle: {
    marginLeft: 8,
    fontSize: 16,
    color: '#f5f3ff',
  },
  heroWrap: {
    paddingHorizontal: spacing.screenHorizontal,
  },
  hero: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 18,
    paddingBottom: 20,
    borderRadius: 20,
    ...shadow.lift,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
    marginTop: 2,
  },
  amountInt: {
    fontSize: 48,
    letterSpacing: -2,
    color: '#ffffff',
    lineHeight: 56,
  },
  amountRest: {
    fontSize: 20,
    letterSpacing: -0.3,
    color: 'rgba(255,255,255,0.95)',
    marginLeft: 2,
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 2,
  },
  giftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(253,244,255,0.75)',
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  giftBtnText: {
    fontSize: 14,
    color: '#fdf4ff',
  },
  body: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  bodyContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.2,
    color: colors.text,
    marginBottom: 12,
  },
  addCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd6fe',
    ...shadow.card,
  },
  cardIconBox: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  plusBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  addCardLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  infoBox: {
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#faf5ff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d8b4fe',
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6b21a8',
    lineHeight: 18,
  },
});
