import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityEmptyIcon } from '../components/ActivityEmptyIcon';
import { fadePressed, typography } from '../constants/design';
import { tabBarBottomOffset } from '../constants/layout';
import { colors } from '../constants/theme';
import type { CustomerBooking } from '../api';
import type { ConfirmedBookingSnapshot } from '../types/booking';
import type { FontFamilies } from '../types/fonts';

const FILTERS = ['All', 'Appointments', 'Gift cards', 'Memberships'] as const;

type Props = {
  fonts: FontFamilies;
  upcomingBooking?: ConfirmedBookingSnapshot | null;
  bookings?: CustomerBooking[];
  onSearchVenues?: () => void;
  onLogin?: () => void;
  onCancelUpcoming?: () => void;
  onOpenBookingDetails?: (booking: ConfirmedBookingSnapshot) => void;
};

export function ActivityScreen({
  fonts,
  upcomingBooking,
  bookings = [],
  onSearchVenues,
  onLogin,
  onCancelUpcoming,
  onOpenBookingDetails,
}: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = tabBarBottomOffset(insets) + 16;
  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>('All');
  const appointmentBookings = useMemo(() => {
    if (!(activeFilter === 'All' || activeFilter === 'Appointments')) return [];
    return bookings.filter((item) => item.status !== 'CANCELLED');
  }, [activeFilter, bookings]);
  const parseBookingDate = (dateLike: string) => {
    const parsed = new Date(dateLike);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const bookingToSnapshot = (booking: CustomerBooking): ConfirmedBookingSnapshot => {
    const start = parseBookingDate(booking.startAt) ?? new Date();
    const end = parseBookingDate(booking.endAt) ?? new Date(start.getTime() + 60 * 60 * 1000);
    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    const durationLine =
      durationMinutes >= 60
        ? `${Math.floor(durationMinutes / 60)} hr${durationMinutes % 60 ? ` ${durationMinutes % 60} min` : ''} duration`
        : `${durationMinutes} min duration`;
    const servicePrice = typeof booking.price === 'number' ? booking.price : null;
    return {
      refId: String(booking.id),
      businessId: String(booking.companyId),
      businessName: booking.companyName || `Salon #${booking.companyId}`,
      heroImage:
        'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1000&q=80',
      timeHeadline: start.toLocaleString(),
      startIso: start.toISOString(),
      durationLine,
      activitySubtitle: `${booking.serviceName ?? 'Service'}${servicePrice != null ? ` • ${servicePrice} zł` : ''}${booking.staffName ? ` • ${booking.staffName}` : ''}`,
      totalCzk: servicePrice ?? 0,
      serviceName: booking.serviceName ?? 'Service',
      priceLabel: servicePrice != null ? `${servicePrice} zł` : '—',
      mapRegion: { latitude: 50.06, longitude: 19.93, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      addressFull: booking.companyName || `Salon #${booking.companyId}`,
      serviceId: booking.serviceId ?? undefined,
      staffId: booking.staffId ?? null,
      durationMinutes,
    };
  };
  const { upcomingItems, pastItems } = useMemo(() => {
    const now = Date.now();
    const upcoming = appointmentBookings
      .filter((item) => {
        const parsed = parseBookingDate(item.startAt);
        return parsed != null && parsed.getTime() >= now;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const past = appointmentBookings
      .filter((item) => {
        const parsed = parseBookingDate(item.startAt);
        return parsed != null && parsed.getTime() < now;
      })
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

    const upcomingSnapshots = upcoming.map((item) => bookingToSnapshot(item));
    if (upcomingBooking) {
      const exists = upcomingSnapshots.some((item) => item.refId === upcomingBooking.refId);
      if (!exists) upcomingSnapshots.unshift(upcomingBooking);
    }
    return { upcomingItems: upcomingSnapshots, pastItems: past };
  }, [appointmentBookings, upcomingBooking]);
  const upcomingRelativeLabel = (timeHeadline: string, startIso?: string) => {
    const start = new Date(startIso ?? timeHeadline);
    if (Number.isNaN(start.getTime())) return 'Upcoming';
    const diffMs = start.getTime() - Date.now();
    if (diffMs <= 0) return 'Starting now';
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 60) return `In ${diffMin} min`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `In ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
    const diffDays = Math.round(diffHours / 24);
    return `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  };
  const openDirections = (target: ConfirmedBookingSnapshot) => {
    const latitude = target.mapRegion.latitude;
    const longitude = target.mapRegion.longitude;
    const label = encodeURIComponent(target.businessName);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Directions unavailable', 'Could not open maps from this device.')
    );
  };
  const addToCalendar = (target: ConfirmedBookingSnapshot) => {
    const parsedStart = new Date(target.startIso ?? target.timeHeadline);
    const start = Number.isNaN(parsedStart.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : parsedStart;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const toGCalDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${target.businessName} - ${target.serviceName}`,
      details: target.activitySubtitle,
      location: target.addressFull,
      dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    });
    const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
    Linking.openURL(calendarUrl).catch(() =>
      Alert.alert('Calendar unavailable', 'Could not open calendar from this device.')
    );
  };

  if (upcomingItems.length === 0 && pastItems.length === 0) {
    return (
      <View style={styles.root}>
        <View
          style={[
            styles.inner,
            { paddingTop: insets.top + 8, paddingBottom: bottomPad, paddingHorizontal: 20 },
          ]}
        >
        <Text style={[typography.screenTitle, { fontFamily: fonts.bold }]}>Activity</Text>

        <View style={styles.empty}>
            <ActivityEmptyIcon />
            <Text style={[styles.heading, { fontFamily: fonts.bold }]}>No activity</Text>
            <Text style={[styles.body, { fontFamily: fonts.regular }]}>
              Log in or sign up to manage your upcoming and past appointments or view activity
            </Text>

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
                onPress={onSearchVenues}
              >
                <Text style={[styles.btnPrimaryText, { fontFamily: fonts.semibold }]}>
                  Search venues
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
                onPress={() => onLogin?.()}
              >
                <Text style={[styles.btnSecondaryText, { fontFamily: fonts.semibold }]}>
                  Log in or sign up
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: bottomPad + 24,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.activityHeader}>
          <Text style={[typography.screenTitle, { fontFamily: fonts.bold }]}>Activity</Text>
          <Pressable hitSlop={12} onPress={onSearchVenues}>
            <Ionicons name="search-outline" size={26} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setActiveFilter(f)}
                style={({ pressed }) => [styles.filterPill, active && styles.filterPillOn, fadePressed(pressed)]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { fontFamily: fonts.semibold },
                    active && styles.filterTextOn,
                  ]}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.sectionRow}>
          <Text style={[typography.subsection, styles.sectionTitle, { fontFamily: fonts.bold }]}>Upcoming</Text>
          <View style={styles.countBadge}>
            <Text style={[styles.countBadgeText, { fontFamily: fonts.semibold }]}>
              {upcomingItems.length}
            </Text>
          </View>
        </View>

        {upcomingItems.map((item) => (
          <Pressable key={item.refId} onPress={() => onOpenBookingDetails?.(item)} style={[styles.bookingCard, { marginTop: 14 }]}>
            <View style={styles.cardHero}>
              <Image source={{ uri: item.heroImage }} style={styles.cardHeroImg} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.78)']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardHeroText}>
                <Text style={[styles.cardSoon, { fontFamily: fonts.regular }]}>
                  {upcomingRelativeLabel(item.timeHeadline, item.startIso)}
                </Text>
                <Text style={[styles.cardBizName, { fontFamily: fonts.bold }]} numberOfLines={2}>
                  {item.businessName}
                </Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTime, { fontFamily: fonts.bold }]}>
                {item.timeHeadline}
              </Text>
              <Text style={[styles.cardMeta, { fontFamily: fonts.regular }]}>
                {item.activitySubtitle}
              </Text>
              <View style={styles.cardActions}>
                <Pressable
                  style={({ pressed }) => [styles.directionsBtn, fadePressed(pressed)]}
                  onPress={(event) => {
                    event.stopPropagation();
                    openDirections(item);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Get directions to venue"
                >
                  <Text style={[styles.directionsBtnText, { fontFamily: fonts.semibold }]}>
                    Get directions
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.calPlusBtn, fadePressed(pressed)]}
                  onPress={(event) => {
                    event.stopPropagation();
                    addToCalendar(item);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Add to calendar"
                >
                  <Ionicons name="calendar-outline" size={22} color={colors.text} />
                </Pressable>
              </View>
            </View>
          </Pressable>
        ))}

        <View style={styles.sectionRow}>
          <Text style={[typography.subsection, styles.sectionTitle, { fontFamily: fonts.bold }]}>Past</Text>
          <View style={styles.countBadge}>
            <Text style={[styles.countBadgeText, { fontFamily: fonts.semibold }]}>{pastItems.length}</Text>
          </View>
        </View>

        {pastItems.map((booking) => (
          <View key={booking.id} style={[styles.bookingCard, { marginTop: 14 }]}>
            <View style={styles.cardBody}>
              <Text style={[styles.cardTime, { fontFamily: fonts.bold }]}>
                {new Date(booking.startAt).toLocaleString()}
              </Text>
              <Text style={[styles.cardMeta, { fontFamily: fonts.regular }]}>
                {booking.companyName} • {booking.serviceName ?? 'Service'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  scroll: { flex: 1 },
  inner: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 20,
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    maxWidth: 400,
    marginTop: 28,
  },
  btnPrimary: {
    backgroundColor: colors.primaryButton,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
  },
  btnSecondary: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    color: colors.text,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.88,
  },
  filterScroll: {
    flexDirection: 'row',
    paddingBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: colors.background,
  },
  filterPillOn: {
    backgroundColor: colors.primaryButton,
  },
  filterText: {
    fontSize: 14,
    color: colors.text,
  },
  filterTextOn: {
    color: '#fff',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    marginRight: 8,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 12,
    color: colors.text,
  },
  bookingCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHero: {
    height: 132,
    position: 'relative',
    backgroundColor: '#111',
  },
  cardHeroImg: {
    ...StyleSheet.absoluteFillObject,
  },
  cardHeroText: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
  },
  cardSoon: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  cardBizName: {
    fontSize: 22,
    color: '#fff',
    letterSpacing: -0.3,
  },
  cardBody: {
    padding: 16,
  },
  cardTime: {
    fontSize: 17,
    color: colors.text,
  },
  cardMeta: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  directionsBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primaryButton,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  directionsBtnText: {
    fontSize: 15,
    color: colors.primaryButton,
  },
  calPlusBtn: {
    width: 52,
    height: 52,
    marginLeft: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  cancelLink: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  cancelLinkText: {
    fontSize: 14,
    color: '#7c3aed',
  },
});
