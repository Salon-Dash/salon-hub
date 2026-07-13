import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fadePressed, shadow } from '../constants/design';
import { tabBarBottomOffset } from '../constants/layout';
import { colors, spacing } from '../constants/theme';
import type { FontFamilies } from '../types/fonts';
import { impactLight } from '../utils/haptics';

type Props = {
  fonts: FontFamilies;
  userName?: string;
  onLogOut?: () => void;
  onEditProfile?: () => void;
  onOpenSettings?: () => void;
};

// Platform support inbox — opens the device mail composer.
const SUPPORT_EMAIL = 'support@salon-hub.com';

export function ProfileScreen({ fonts, userName, onLogOut, onEditProfile, onOpenSettings }: Props) {
  const displayName = userName?.trim() || 'Customer';
  const initial = displayName.charAt(0).toUpperCase();
  const insets = useSafeAreaInsets();
  const bottomPad = tabBarBottomOffset(insets) + 28;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.topContentInset, paddingBottom: bottomPad },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { fontFamily: fonts.semibold }]}>PROFILE</Text>
            <Text style={[styles.name, { fontFamily: fonts.bold }]} numberOfLines={2}>
              {displayName}
            </Text>
            <Text style={[styles.subtitle, { fontFamily: fonts.regular }]}>Account center</Text>
          </View>
          <LinearGradient colors={['#6d28d9', '#7c3aed']} style={styles.avatar} accessibilityLabel="Profile photo">
            <Text style={[styles.avatarLetter, { fontFamily: fonts.bold }]}>{initial}</Text>
          </LinearGradient>
        </View>

        <View style={styles.cluster}>
          <Text style={[styles.clusterTitle, { fontFamily: fonts.semibold }]}>Preferences</Text>
          <CardAction
            fonts={fonts}
            icon="person-circle-outline"
            label="Personal info"
            onPress={() => {
              impactLight();
              onEditProfile?.();
            }}
          />
          <CardAction
            fonts={fonts}
            icon="options-outline"
            label="App settings"
            onPress={() => {
              impactLight();
              onOpenSettings?.();
            }}
          />
        </View>

        <View style={styles.cluster}>
          <Text style={[styles.clusterTitle, { fontFamily: fonts.semibold }]}>Help</Text>
          <CardAction
            fonts={fonts}
            icon="help-circle-outline"
            label="Support"
            onPress={() => {
              impactLight();
              Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Salon%20Hub%20support`).catch(() => {});
            }}
          />
        </View>
        {/* Deferred (need backend): Saved places (favorites), Forms & consents,
            Language (i18n) — removed rather than shipped as no-op buttons. */}

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, fadePressed(pressed)]}
          onPress={() => {
            impactLight();
            onLogOut?.();
          }}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.text} />
          <Text style={[styles.signOutText, { fontFamily: fonts.semibold }]}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function CardAction({
  fonts,
  icon,
  label,
  onPress,
}: {
  fonts: FontFamilies;
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.cardAction, fadePressed(pressed)]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.iconShell}>
        <Ionicons name={icon} size={19} color={colors.text} />
      </View>
      <Text style={[styles.cardActionLabel, { fontFamily: fonts.regular }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={17} color={colors.textLight} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  scroll: {
    paddingHorizontal: spacing.screenHorizontal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
    marginRight: 14,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#7c3aed',
    marginBottom: 8,
  },
  name: {
    fontSize: 29,
    letterSpacing: -0.5,
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 4,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 23,
    color: '#ffffff',
  },
  cluster: {
    marginBottom: 14,
  },
  clusterTitle: {
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd6fe',
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 8,
    ...shadow.card,
  },
  iconShell: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardActionLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  signOutBtn: {
    marginTop: 4,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd6fe',
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  signOutText: {
    marginLeft: 10,
    fontSize: 15,
    color: colors.text,
  },
});
