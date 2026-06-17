import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';

import { colors, spacing } from '../constants/theme';
import type { ConfirmedBookingSnapshot } from '../types/booking';
import type { FontFamilies } from '../types/fonts';

type Props = {
  fonts: FontFamilies;
  booking: ConfirmedBookingSnapshot;
  onBack: () => void;
  onCancel?: () => void;
};

export function BookingDetailsScreen({ fonts, booking, onBack, onCancel }: Props) {
  const insets = useSafeAreaInsets();

  const openDirections = () => {
    const latitude = booking.mapRegion.latitude;
    const longitude = booking.mapRegion.longitude;
    const label = encodeURIComponent(booking.businessName);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`
        : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Directions unavailable', 'Could not open maps from this device.')
    );
  };

  const addToCalendar = () => {
    const parsedStart = new Date(booking.startIso ?? booking.timeHeadline);
    const start = Number.isNaN(parsedStart.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : parsedStart;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const toGCalDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${booking.businessName} - ${booking.serviceName}`,
      details: booking.activitySubtitle,
      location: booking.addressFull,
      dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    });
    const calendarUrl = `https://calendar.google.com/calendar/render?${params.toString()}`;
    Linking.openURL(calendarUrl).catch(() =>
      Alert.alert('Calendar unavailable', 'Could not open calendar from this device.')
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 22 }}
      >
        <View style={styles.hero}>
          <Image source={{ uri: booking.heroImage }} style={styles.heroImage} contentFit="cover" />
          <View style={styles.heroOverlay} />
          <Pressable onPress={onBack} style={[styles.heroBackBtn, { top: insets.top + 8 }]}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.heroTitle, { fontFamily: fonts.bold }]}>
            {booking.businessName}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={[styles.statusPillText, { fontFamily: fonts.semibold }]}>Confirmed</Text>
          </View>

          <Text style={[styles.timeHeadline, { fontFamily: fonts.bold }]}>{booking.timeHeadline}</Text>
          <Text style={[styles.timeSubhead, { fontFamily: fonts.regular }]}>{booking.durationLine}</Text>

          <View style={styles.card}>
            <Pressable onPress={addToCalendar} style={styles.rowBtn}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="calendar-outline" size={17} color="#5b3de0" />
              </View>
              <Text style={[styles.rowTitle, { fontFamily: fonts.semibold }]}>Add to calendar</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
            <View style={styles.divider} />
            <Pressable onPress={openDirections} style={styles.rowBtn}>
              <View style={styles.rowIconWrap}>
                <Ionicons name="storefront-outline" size={17} color="#5b3de0" />
              </View>
              <Text style={[styles.rowTitle, { fontFamily: fonts.semibold }]}>Venue details</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { fontFamily: fonts.bold }]}>Overview</Text>
          <View style={styles.card}>
            <View style={styles.totalRow}>
              <Text style={[styles.overviewTitle, { fontFamily: fonts.semibold }]}>{booking.serviceName}</Text>
              <Text style={[styles.overviewPrice, { fontFamily: fonts.semibold }]}>{booking.priceLabel}</Text>
            </View>
            <Text style={[styles.overviewMeta, { fontFamily: fonts.regular }]}>{booking.durationLine}</Text>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalText, { fontFamily: fonts.bold }]}>Total</Text>
              <Text style={[styles.totalText, { fontFamily: fonts.bold }]}>{booking.totalCzk} CZK</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { fontFamily: fonts.bold }]}>More details</Text>
          <View style={styles.card}>
            <Text style={[styles.detailTitle, { fontFamily: fonts.semibold }]}>Cancellation policy</Text>
            <Text style={[styles.detailBody, { fontFamily: fonts.regular }]}>
              You can cancel at any time before your appointment.
            </Text>
            <Pressable
              style={styles.detailActionRow}
              onPress={() => Alert.alert('Reschedule', 'Rescheduling is not yet available. Please cancel and rebook.')}
            >
              <Ionicons name="calendar-number-outline" size={20} color={colors.text} />
              <Text style={[styles.detailActionText, { fontFamily: fonts.regular }]}>Reschedule appointment</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
            <Pressable style={styles.detailActionRow} onPress={onCancel}>
              <Ionicons name="close-circle-outline" size={20} color={colors.text} />
              <Text style={[styles.detailActionText, { fontFamily: fonts.regular }]}>Cancel appointment</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { fontFamily: fonts.bold }]}>Getting there</Text>
          <View style={styles.card}>
            <View style={styles.mapWrap}>
              <MapView
                style={StyleSheet.absoluteFill}
                initialRegion={booking.mapRegion}
                region={booking.mapRegion}
                pointerEvents="none"
              >
                <Marker coordinate={booking.mapRegion} />
              </MapView>
            </View>
            <Text style={[styles.addressText, { fontFamily: fonts.regular }]}>{booking.addressFull}</Text>
            <Pressable onPress={openDirections}>
              <Text style={[styles.linkText, { fontFamily: fonts.semibold }]}>Get directions</Text>
            </Pressable>
          </View>

          <Text style={[styles.refText, { fontFamily: fonts.regular }]}>Booking ref: {booking.refId}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f7' },
  hero: { height: 186, position: 'relative' },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroBackBtn: {
    position: 'absolute',
    left: spacing.screenHorizontal,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  heroTitle: {
    position: 'absolute',
    left: spacing.screenHorizontal,
    right: spacing.screenHorizontal,
    bottom: 14,
    fontSize: 32,
    lineHeight: 36,
    color: '#fff',
    letterSpacing: -0.9,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 12,
  },
  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6d4df2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: { color: '#fff', fontSize: 14, lineHeight: 16 },
  timeHeadline: {
    marginTop: 12,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    letterSpacing: -0.8,
  },
  timeSubhead: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textMuted,
  },
  card: {
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9e9ed',
    padding: 14,
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
  },
  rowIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f2edff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { flex: 1, fontSize: 16, color: colors.text },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6ea',
    marginVertical: 10,
  },
  sectionTitle: {
    marginTop: 18,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    letterSpacing: -0.8,
  },
  overviewTitle: { fontSize: 16, color: colors.text, flex: 1 },
  overviewPrice: { fontSize: 16, color: colors.text },
  overviewMeta: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textMuted,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalText: { fontSize: 16, color: colors.text },
  detailTitle: { fontSize: 16, color: colors.text },
  detailBody: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  detailActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailActionText: { flex: 1, fontSize: 15, color: colors.text },
  mapWrap: {
    height: 152,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#d0d7e2',
  },
  addressText: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  linkText: {
    marginTop: 8,
    fontSize: 15,
    color: '#6d4df2',
  },
  refText: {
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
  },
});
