import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type BusinessHoursItem, type PublicSalonProfile } from '../api';
import { fadePressed } from '../constants/design';
import { colors, spacing } from '../constants/theme';
import type { FontFamilies } from '../types/fonts';

type Props = {
  businessId: string;
  fonts: FontFamilies;
  onBack: () => void;
  onBookNow?: (serviceId?: string) => void;
};

type Tab = 'photos' | 'services' | 'team' | 'reviews' | 'about';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'photos', label: 'Photos' },
  { id: 'services', label: 'Services' },
  { id: 'team', label: 'Team' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'about', label: 'About' },
];

const WEEK_DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;

function humanDay(day: string) {
  return day.charAt(0) + day.slice(1).toLowerCase();
}

export function BusinessProfileScreen({ businessId, fonts, onBack, onBookNow }: Props) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicSalonProfile | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('photos');
  const [isLoading, setIsLoading] = useState(true);
  const [serviceCategoryTab, setServiceCategoryTab] = useState('All');
  const [businessHours, setBusinessHours] = useState<BusinessHoursItem[]>([]);

  useEffect(() => {
    const parsed = Number(businessId);
    if (!Number.isFinite(parsed)) {
      setError('Invalid salon id.');
      return;
    }
    setError('');
    setProfile(null);
    setBusinessHours([]);
    setIsLoading(true);
    Promise.all([
      api.salonProfile(parsed),
      api.businessHours(parsed).catch(() => []),
    ])
      .then(([profilePayload, hoursPayload]) => {
        setProfile(profilePayload);
        setBusinessHours(Array.isArray(hoursPayload) ? hoursPayload : []);
      })
      .catch((e: Error) => {
        setError(e.message || 'Could not load salon profile.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [businessId]);

  const region = useMemo(
    () => ({
      latitude: profile?.latitude ?? 50.0614,
      longitude: profile?.longitude ?? 19.9366,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }),
    [profile?.latitude, profile?.longitude]
  );
  const reviewCount = profile?.reviews?.length ?? 0;
  const heroPhotos = [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1600&q=80',
    'https://images.unsplash.com/photo-1520333789090-1afc82db536a?w=1600&q=80',
    'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1600&q=80',
  ];
  const serviceCategoryTabs = useMemo(() => {
    const categories = new Set<string>();
    (profile?.services ?? []).forEach((service) => {
      const category = service.category?.trim();
      if (category) categories.add(category);
    });
    return ['All', ...Array.from(categories)];
  }, [profile?.services]);

  const visibleServices = useMemo(() => {
    if (!profile?.services) return [];
    if (serviceCategoryTab === 'All') return profile.services;
    return profile.services.filter((service) => service.category?.trim() === serviceCategoryTab);
  }, [profile?.services, serviceCategoryTab]);

  const orderedBusinessHours = useMemo(() => {
    if (!businessHours.length) return [];
    const indexByDay: Record<string, number> = WEEK_DAY_ORDER.reduce<Record<string, number>>((acc, day, idx) => {
      acc[day] = idx;
      return acc;
    }, {});
    return [...businessHours].sort((a, b) => {
      const aIdx = indexByDay[a.dayOfWeek.toUpperCase()] ?? 99;
      const bIdx = indexByDay[b.dayOfWeek.toUpperCase()] ?? 99;
      return aIdx - bIdx;
    });
  }, [businessHours]);

  useEffect(() => {
    setServiceCategoryTab('All');
  }, [businessId, profile?.id]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 92 }}
      >
        <View style={styles.heroWrap}>
          <Image
            source={{
              uri: heroPhotos[0],
            }}
            style={styles.heroImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <View style={[styles.heroHeaderRow, { top: insets.top + 10 }]}>
            <Pressable style={({ pressed }) => [styles.heroIconBtn, fadePressed(pressed)]} onPress={onBack}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
            <View style={styles.heroHeaderRight}>
              <Pressable style={({ pressed }) => [styles.heroIconBtn, fadePressed(pressed)]}>
                <Ionicons name="share-social-outline" size={19} color={colors.text} />
              </Pressable>
              <Pressable style={({ pressed }) => [styles.heroIconBtn, fadePressed(pressed)]}>
                <Ionicons name="heart-outline" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>
          <View style={styles.photoCountPill}>
            <Text style={[styles.photoCountText, { fontFamily: fonts.semibold }]}>1/{heroPhotos.length}</Text>
          </View>
        </View>

        <View style={styles.block}>
          <Text style={[styles.title, { fontFamily: fonts.bold }]}>
            {profile?.name ?? (isLoading ? 'Loading salon...' : 'Salon unavailable')}
          </Text>
          <Text style={[styles.ratingLine, { fontFamily: fonts.semibold }]}>
            {reviewCount > 0 ? `${reviewCount} review${reviewCount === 1 ? '' : 's'}` : 'No reviews yet'}
          </Text>
          <Text style={[styles.address, { fontFamily: fonts.regular }]}>
            {profile?.businessAddress ?? 'Address unavailable'}
          </Text>
          {profile?.category ? (
            <View style={styles.categoryPill}>
              <Text style={[styles.categoryPillText, { fontFamily: fonts.semibold }]}>{profile.category}</Text>
            </View>
          ) : null}
          {error ? <Text style={[styles.error, { fontFamily: fonts.regular }]}>{error}</Text> : null}
        </View>

        {profile ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabStrip}
            contentContainerStyle={styles.tabStripContent}
          >
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setTab(item.id)}
                  style={({ pressed }) => [styles.tabBtn, fadePressed(pressed)]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { fontFamily: active ? fonts.semibold : fonts.regular },
                      active && styles.tabTextOn,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {active ? <View style={styles.tabUnderline} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.block}>
            {isLoading ? (
              <View style={styles.skeletonWrap}>
                <View style={styles.skeletonLineLg} />
                <View style={styles.skeletonLineMd} />
                <View style={styles.skeletonPanel} />
              </View>
            ) : (
              <Text style={[styles.muted, { fontFamily: fonts.regular }]}>
                Profile is not available yet. Please try another salon.
              </Text>
            )}
          </View>
        )}

        {profile && tab === 'photos' && (
          <View style={styles.block}>
            <View style={styles.photosRow}>
              {heroPhotos.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.photoTile} contentFit="cover" cachePolicy="memory-disk" />
              ))}
            </View>
          </View>
        )}

        {profile && tab === 'services' && (
          <View style={styles.block}>
            {serviceCategoryTabs.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.serviceCategoryTabs}
              >
                {serviceCategoryTabs.map((category) => {
                  const active = serviceCategoryTab === category;
                  return (
                    <Pressable
                      key={category}
                      onPress={() => setServiceCategoryTab(category)}
                      style={({ pressed }) => [
                        styles.serviceCategoryTabBtn,
                        active && styles.serviceCategoryTabBtnActive,
                        fadePressed(pressed),
                      ]}
                    >
                      <Text
                        style={[
                          styles.serviceCategoryTabText,
                          { fontFamily: active ? fonts.semibold : fonts.regular },
                          active && styles.serviceCategoryTabTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            {visibleServices.length ? (
              visibleServices.map((service) => (
                <View key={service.id} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={[styles.rowTitle, { fontFamily: fonts.semibold }]}>{service.name}</Text>
                    <Text style={[styles.rowMeta, { fontFamily: fonts.regular }]}>
                      {service.durationMinutes} min · {service.price} zł
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.bookBtnSmall, fadePressed(pressed)]}
                    onPress={() => onBookNow?.(String(service.id))}
                  >
                    <Text style={[styles.bookBtnSmallText, { fontFamily: fonts.semibold }]}>Book</Text>
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={[styles.muted, { fontFamily: fonts.regular }]}>
                {serviceCategoryTab === 'All'
                  ? 'No services published yet.'
                  : `No services in "${serviceCategoryTab}" yet.`}
              </Text>
            )}
          </View>
        )}

        {profile && tab === 'team' && (
          <View style={styles.block}>
            {profile?.staff.length ? (
              <View style={styles.teamRowWrap}>
                {profile.staff.map((member) => (
                  <View key={member.id} style={styles.teamCard}>
                    <Image
                      source={{ uri: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&q=80' }}
                      style={styles.teamAvatar}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                    <Text style={[styles.teamName, { fontFamily: fonts.semibold }]} numberOfLines={1}>
                      {member.fullName}
                    </Text>
                    <Text style={[styles.teamRole, { fontFamily: fonts.regular }]} numberOfLines={1}>
                      {member.role || 'Staff'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.muted, { fontFamily: fonts.regular }]}>No staff published yet.</Text>
            )}
          </View>
        )}

        {profile && tab === 'reviews' && (
          <View style={styles.block}>
            {profile?.reviews.length ? (
              profile.reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <Text style={[styles.rowTitle, { fontFamily: fonts.semibold }]}>{review.author}</Text>
                  <Text style={[styles.rowMeta, { fontFamily: fonts.regular }]}>{review.text}</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.muted, { fontFamily: fonts.regular }]}>No reviews yet.</Text>
            )}
          </View>
        )}

        {profile && tab === 'about' && (
          <View style={styles.block}>
            <Text style={[styles.sectionTitle, { fontFamily: fonts.bold }]}>About</Text>
            <Text style={[styles.rowMeta, { fontFamily: fonts.regular }]}>
              {profile?.about?.trim() || 'No about information provided yet.'}
            </Text>
            <Text style={[styles.sectionTitle, styles.sectionSpacing, { fontFamily: fonts.bold }]}>Opening times</Text>
            {orderedBusinessHours.length ? (
              <View style={styles.openingList}>
                {orderedBusinessHours.map((item, idx) => (
                  <View
                    key={`${item.dayOfWeek}-${item.id}`}
                    style={[styles.openingRow, idx === orderedBusinessHours.length - 1 && styles.openingRowLast]}
                  >
                    <Text style={[styles.openingDay, { fontFamily: fonts.regular }]}>{humanDay(item.dayOfWeek)}</Text>
                    <Text style={[styles.openingHours, { fontFamily: fonts.semibold }]}>
                      {item.enabled && item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : 'Closed'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.openingUnavailable}>
                <Text style={[styles.openingUnavailableText, { fontFamily: fonts.regular }]}>
                  Opening times are not published yet.
                </Text>
              </View>
            )}
            <View style={styles.mapCard}>
              <MapView style={styles.map} region={region} scrollEnabled={false}>
                <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
              </MapView>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <Text style={[styles.footerHint, { fontFamily: fonts.regular }]}>
          {profile?.services?.length ?? 0} services available
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.bookBtn,
            (!profile || profile.services.length === 0) && styles.bookBtnDisabled,
            fadePressed(pressed),
          ]}
          disabled={!profile || profile.services.length === 0}
          onPress={() => onBookNow?.()}
        >
          <Text style={[styles.bookBtnText, { fontFamily: fonts.bold }]}>Book now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  heroWrap: {
    height: 286,
    backgroundColor: '#e5e7eb',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroHeaderRow: {
    position: 'absolute',
    left: spacing.screenHorizontal,
    right: spacing.screenHorizontal,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroHeaderRight: {
    flexDirection: 'row',
    gap: 10,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCountPill: {
    position: 'absolute',
    right: spacing.screenHorizontal,
    bottom: 16,
    backgroundColor: 'rgba(17,24,39,0.78)',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 13,
  },
  block: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: 12 },
  title: { fontSize: 36, color: colors.text, letterSpacing: -0.5, lineHeight: 40 },
  ratingLine: { marginTop: 6, color: colors.textMuted, fontSize: 15 },
  address: { marginTop: 4, color: colors.textMuted, fontSize: 15 },
  categoryPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#dbe2ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryPillText: {
    color: '#4f46e5',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  error: { marginTop: 8, color: colors.error, fontSize: 14 },
  tabStrip: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  tabStripContent: {
    paddingHorizontal: spacing.screenHorizontal,
    alignItems: 'center',
  },
  tabBtn: { paddingVertical: 12, marginRight: 20, position: 'relative', minHeight: 44, justifyContent: 'center' },
  tabText: { fontSize: 15, color: colors.textMuted },
  tabTextOn: { color: colors.text },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoTile: {
    flex: 1,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  serviceCategoryTabs: {
    paddingBottom: 10,
    gap: 8,
  },
  serviceCategoryTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  serviceCategoryTabBtnActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  serviceCategoryTabText: {
    fontSize: 13,
    color: colors.text,
    textTransform: 'capitalize',
  },
  serviceCategoryTabTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rowLeft: { flex: 1, paddingRight: 8 },
  rowTitle: { fontSize: 15, color: colors.text },
  rowMeta: { marginTop: 4, fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  muted: { fontSize: 14, color: colors.textMuted },
  teamRowWrap: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  teamCard: {
    width: 92,
    alignItems: 'center',
  },
  teamAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#e5e7eb',
  },
  teamName: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text,
  },
  teamRole: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: '#eef2f7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  mapCard: {
    marginTop: 16,
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  map: { width: '100%', height: '100%' },
  sectionTitle: {
    fontSize: 20,
    color: colors.text,
    marginBottom: 8,
  },
  sectionSpacing: {
    marginTop: 18,
  },
  openingUnavailable: {
    borderWidth: 1,
    borderColor: '#eceff3',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  openingUnavailableText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  openingList: {
    borderWidth: 1,
    borderColor: '#eceff3',
    borderRadius: 14,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  openingRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eceff3',
  },
  openingRowLast: {
    borderBottomWidth: 0,
  },
  openingDay: {
    fontSize: 14,
    color: colors.text,
  },
  openingHours: {
    fontSize: 14,
    color: colors.text,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: 10,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  footerHint: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 15,
  },
  bookBtn: {
    backgroundColor: '#0b0f19',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 28,
  },
  bookBtnDisabled: {
    opacity: 0.5,
  },
  bookBtnText: { color: '#fff', fontSize: 16 },
  bookBtnSmall: {
    borderWidth: 1,
    borderColor: colors.primaryButton,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bookBtnSmallText: { color: colors.primaryButton, fontSize: 14 },
  skeletonWrap: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  skeletonLineLg: {
    height: 14,
    width: '62%',
    borderRadius: 7,
    backgroundColor: '#e5e7eb',
  },
  skeletonLineMd: {
    marginTop: 8,
    height: 12,
    width: '44%',
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },
  skeletonPanel: {
    marginTop: 12,
    height: 88,
    borderRadius: 10,
    backgroundColor: '#eef0f3',
  },
});
