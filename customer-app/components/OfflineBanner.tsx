import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '../constants/design';
import { colors } from '../constants/theme';

/**
 * Offline awareness (Design Monks #8 — offline functionality awareness).
 * Keeps copy actionable and non-technical.
 */
export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setOnline(true);
      return;
    }

    let mounted = true;
    NetInfo.fetch().then((s) => {
      if (mounted) setOnline(s.isConnected ?? !!s.isInternetReachable);
    });

    const unsub = NetInfo.addEventListener((s) => {
      setOnline(s.isConnected ?? !!s.isInternetReachable);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  if (online) return null;

  return (
    <View
      style={[styles.wrap, { paddingTop: insets.top + 8 }]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.inner}>
        <Ionicons
          name="cloud-offline-outline"
          size={20}
          color={colors.text}
          style={styles.icon}
        />
        <Text style={[typography.caption, styles.text]}>
          You&apos;re offline. Check your connection — booking and maps need the internet.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 300,
    elevation: 30,
    backgroundColor: colors.warningSurface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.warningBorder,
    pointerEvents: 'box-none',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  icon: { marginRight: 10, marginTop: 1 },
  text: {
    flex: 1,
    color: colors.text,
    lineHeight: 18,
  },
});
