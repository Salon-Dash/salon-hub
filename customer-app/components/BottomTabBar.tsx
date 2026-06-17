import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fadePressed } from '../constants/design';
import { TAB_BAR_FLOAT_GAP } from '../constants/layout';
import { impactLight } from '../utils/haptics';
import { colors } from '../constants/theme';

export type TabKey = 'home' | 'search' | 'activity' | 'profile';

type Props = {
  active: TabKey;
  onChange?: (tab: TabKey) => void;
};

const TABS: { key: TabKey; icon: ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'home', icon: 'home-outline' },
  { key: 'search', icon: 'search-outline' },
  { key: 'activity', icon: 'calendar-outline' },
  { key: 'profile', icon: 'person-outline' },
];

const INACTIVE_ICON = '#9ca3af';
/** Light grey rounded slot behind the active tab (reference UI). */
const ACTIVE_SLOT_BG = '#e8e9ee';
const INNER_PURPLE_SIZE = 38;

export function BottomTabBar({ active, onChange }: Props) {
  const insets = useSafeAreaInsets();

  const Shell = Platform.OS === 'ios' ? BlurView : View;
  const shellProps =
    Platform.OS === 'ios'
      ? { intensity: 85, tint: 'light' as const }
      : {};

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatLayer,
        {
          paddingBottom: insets.bottom + TAB_BAR_FLOAT_GAP,
          paddingHorizontal: 20,
        },
      ]}
    >
      <View style={styles.shadowWrap}>
        <Shell {...shellProps} style={styles.pillBlur}>
          {Platform.OS === 'android' && <View style={styles.androidFrost} />}
          {/* Frosted tint over blur (iOS) / reinforces glass look */}
          <View style={styles.glassTint} pointerEvents="none" />
          <View style={styles.row}>
            {TABS.map(({ key, icon }) => {
              const isActive = active === key;
              return (
                <Pressable
                  key={key}
                  style={({ pressed }) => [styles.tabHit, fadePressed(pressed, 0.9)]}
                  onPress={() => {
                    impactLight();
                    onChange?.(key);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={key}
                >
                  {isActive ? (
                    <View style={styles.activeSlot}>
                      <View style={styles.activeIconCircle}>
                        <Ionicons name={icon} size={21} color={colors.accent} />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.inactiveWrap}>
                      <Ionicons name={icon} size={23} color={INACTIVE_ICON} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Shell>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 24,
    alignItems: 'center',
  },
  shadowWrap: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 28,
      },
      android: {
        elevation: 18,
      },
    }),
  },
  pillBlur: {
    borderRadius: 999,
    overflow: 'hidden',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  androidFrost: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  glassTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabHit: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: INNER_PURPLE_SIZE + 6,
  },
  activeSlot: {
    backgroundColor: ACTIVE_SLOT_BG,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconCircle: {
    width: INNER_PURPLE_SIZE,
    height: INNER_PURPLE_SIZE,
    borderRadius: INNER_PURPLE_SIZE / 2,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveWrap: {
    width: INNER_PURPLE_SIZE + 4,
    height: INNER_PURPLE_SIZE + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
