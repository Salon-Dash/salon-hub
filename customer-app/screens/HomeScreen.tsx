import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api, type PublicSalon } from '../api';
import { ExploreSection } from '../components/ExploreSection';
import { SalonCarouselSection } from '../components/SalonCarouselSection';
import { TopCategoriesSection } from '../components/TopCategoriesSection';
import { typography } from '../constants/design';
import { impactLight } from '../utils/haptics';
import { tabBarBottomOffset } from '../constants/layout';
import { colors, spacing } from '../constants/theme';
import type { CategoryTile, SalonCardItem } from '../types/discovery';
import type { FontFamilies } from '../types/fonts';

type Props = {
  fonts: FontFamilies;
  onPressSearch?: () => void;
  onOpenSalon?: (id: string) => void;
};

export function HomeScreen({ fonts, onPressSearch, onOpenSalon }: Props) {
  const insets = useSafeAreaInsets();
  const [liveSalons, setLiveSalons] = useState<PublicSalon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const bottomInset = tabBarBottomOffset(insets) + 20;

  useEffect(() => {
    let mounted = true;
    api
      .discoverSalons()
      .then((payload) => {
        if (!mounted) return;
        setLoadError('');
        setLiveSalons(payload);
      })
      .catch(() => {
        if (!mounted) return;
        setLoadError('Could not load salons right now.');
        setLiveSalons([]);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const mappedLive = useMemo<SalonCardItem[]>(
    () =>
      liveSalons.map((salon, index) => ({
        id: String(salon.id),
        name: salon.name,
        rating: salon.hasReviews ? '5.0' : '4.8',
        reviews: salon.hasReviews ? 10 + index * 7 : 0,
        location: salon.businessAddress ?? 'Address on request',
        category: salon.hasTeam ? 'Hair & beauty' : 'Salon',
        image:
          'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1000&q=80',
      })),
    [liveSalons]
  );

  const recommended = mappedLive.slice(0, 8);
  const newest = mappedLive.slice(8, 16);
  const trending = mappedLive.slice(16, 24);
  const topCategories = useMemo<CategoryTile[]>(
    () =>
      mappedLive.slice(0, 12).map((salon) => ({
        id: `top-${salon.id}`,
        label: salon.category,
        image: salon.image,
      })),
    [mappedLive]
  );
  const exploreCategories = useMemo<CategoryTile[]>(
    () =>
      mappedLive.slice(0, 6).map((salon, index) => ({
        id: `explore-${salon.id}`,
        label: salon.name,
        image: salon.image,
        color: ['#fbbf24', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#22c55e'][index % 6],
      })),
    [mappedLive]
  );
  const hasAnySalons = mappedLive.length > 0;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.topContentInset,
            paddingBottom: bottomInset + 24,
            paddingHorizontal: spacing.screenHorizontal,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Text style={[typography.screenTitle, { fontFamily: fonts.bold }]}>For You</Text>
          <Pressable
            style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.88 }]}
            hitSlop={12}
            onPress={() => {
              impactLight();
              onPressSearch?.();
            }}
            accessibilityRole="button"
            accessibilityLabel="Search venues and treatments"
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.skeletonWrap}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonRow}>
              <View style={styles.skeletonCard} />
              <View style={styles.skeletonCard} />
            </View>
            <View style={[styles.skeletonTitle, { marginTop: 18 }]} />
            <View style={styles.skeletonRow}>
              <View style={styles.skeletonCardSmall} />
              <View style={styles.skeletonCardSmall} />
              <View style={styles.skeletonCardSmall} />
            </View>
            <Text style={[styles.skeletonHint, { fontFamily: fonts.regular }]}>
              Pulling latest venues from backend...
            </Text>
          </View>
        ) : !hasAnySalons ? (
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { fontFamily: fonts.semibold }]}>
              {loadError || 'No salons available yet'}
            </Text>
            <Text style={[styles.emptyBody, { fontFamily: fonts.regular }]}>
              Try searching manually or check back in a moment.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.88 }]}
              onPress={onPressSearch}
            >
              <Text style={[styles.retryText, { fontFamily: fonts.semibold }]}>Search venues</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <SalonCarouselSection
              title="Recommended"
              data={recommended}
              fonts={fonts}
              onPressSalon={onOpenSalon}
            />
            <SalonCarouselSection
              title="New to Fresha"
              data={newest}
              fonts={fonts}
              onPressSalon={onOpenSalon}
            />
            <SalonCarouselSection
              title="Trending"
              data={trending}
              fonts={fonts}
              onPressSalon={onOpenSalon}
            />
            <ExploreSection fonts={fonts} categories={exploreCategories} />
            <TopCategoriesSection fonts={fonts} categories={topCategories} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sectionGap - 6,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  emptyCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.text,
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: colors.primaryButton,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryText: {
    fontSize: 13,
    color: '#fff',
  },
  skeletonWrap: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonTitle: {
    width: 140,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e5e7eb',
  },
  skeletonRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  skeletonCard: {
    flex: 1,
    height: 130,
    borderRadius: 12,
    backgroundColor: '#eef0f3',
  },
  skeletonCardSmall: {
    flex: 1,
    height: 84,
    borderRadius: 12,
    backgroundColor: '#eef0f3',
  },
  skeletonHint: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textMuted,
  },
});
