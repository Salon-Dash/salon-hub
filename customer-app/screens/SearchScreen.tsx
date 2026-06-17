import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, type PublicSalon } from '../api';
import { SearchVenueCard } from '../components/SearchVenueCard';
import { fadePressed } from '../constants/design';
import { tabBarBottomOffset } from '../constants/layout';
import { colors, spacing } from '../constants/theme';
import type { SearchVenue } from '../types/discovery';
import type { FontFamilies } from '../types/fonts';

type Props = {
  fonts: FontFamilies;
  onPressVenue?: (venue: SearchVenue) => void;
};

const KRAKOW_REGION: Region = {
  latitude: 50.0614,
  longitude: 19.9366,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const FILTERS = ['Venues', 'Sort', 'Price', 'Amenities'] as const;
const PRICE_OPTIONS = [null, 500, 800, 1200] as const;
const AMENITY_OPTIONS = [null, 'withTeam', 'withReviews', 'withAddress'] as const;
type AmenityFilter = (typeof AMENITY_OPTIONS)[number];

function amenityLabel(amenity: AmenityFilter) {
  if (amenity == null) return 'any';
  if (amenity === 'withTeam') return 'Team';
  if (amenity === 'withReviews') return 'Reviews';
  return 'Address';
}

function SalonMarkerDot({ highlighted }: { highlighted?: boolean }) {
  return (
    <View style={[styles.markerDot, highlighted && styles.markerDotHighlighted]} />
  );
}

export function SearchScreen({ fonts, onPressVenue }: Props) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [salons, setSalons] = useState<PublicSalon[]>([]);
  const [region, setRegion] = useState<Region>(KRAKOW_REGION);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');
  const [hasAutoLocated, setHasAutoLocated] = useState(false);
  const [query, setQuery] = useState('');
  const [sortByName, setSortByName] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [amenityIdx, setAmenityIdx] = useState(0);
  const selectedAmenity = AMENITY_OPTIONS[amenityIdx] ?? null;
  const isAmenityMatch = useCallback(
    (venue: SearchVenue) => {
      if (selectedAmenity == null) return false;
      if (selectedAmenity === 'withTeam') return Boolean(venue.hasTeam);
      if (selectedAmenity === 'withReviews') return Boolean(venue.hasReviews);
      return Boolean(venue.serviceLabel && venue.serviceLabel !== 'Book your next service');
    },
    [selectedAmenity]
  );
  /** Scroll padding so venue rows clear the floating tab bar (sheet itself is edge-to-edge). */
  const listBottomPad = tabBarBottomOffset(insets);
  const snapPoints = useMemo(() => ['30%', '52%', '88%'], []);
  const venues: SearchVenue[] = useMemo(
    () => {
      const mapped = (Array.isArray(salons) ? salons : []).map((salon, index) => ({
        id: String(salon.id),
        name: salon.name,
        rating: salon.hasReviews ? 'RATED' : 'NEW',
        reviews: salon.hasReviews ? Math.max(1, 1 + index) : 0,
        serviceLabel: salon.businessAddress ?? 'Book your next service',
        priceFrom: salon.minPrice != null ? `from ${Math.round(salon.minPrice)} CZK` : 'Price on request',
        image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80',
        latitude: salon.latitude ?? 50.0614 + index * 0.005,
        longitude: salon.longitude ?? 19.9366 + index * 0.005,
        minPriceCzk: salon.minPrice ?? null,
        hasTeam: Boolean(salon.hasTeam),
        hasReviews: Boolean(salon.hasReviews),
      }));
      return sortByName ? [...mapped].sort((a, b) => a.name.localeCompare(b.name)) : mapped;
    },
    [salons, sortByName]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      api.searchSalons(
        query.trim(),
        {
          minLat: region.latitude - region.latitudeDelta / 2,
          maxLat: region.latitude + region.latitudeDelta / 2,
          minLng: region.longitude - region.longitudeDelta / 2,
          maxLng: region.longitude + region.longitudeDelta / 2,
        },
        {
          maxPrice,
          amenities: selectedAmenity ? [selectedAmenity] : [],
        }
      )
        .then(async (payload) => {
          if (!Array.isArray(payload)) {
            setSalons([]);
            return;
          }

          if (payload.length > 0) {
            setSalons(payload);
            return;
          }

          // If bounded search is empty, fall back to a global list so newly
          // created salons are still discoverable even when map is centered far away.
          if (!query.trim()) {
            try {
              const discovered = await api.discoverSalons(24);
              setSalons(Array.isArray(discovered) ? discovered : []);
              return;
            } catch {
              // fall through to empty state
            }
          }
          setSalons([]);
        })
        .catch(() => setSalons([]));
    }, 350);
    return () => clearTimeout(timeoutId);
  }, [maxPrice, query, region.latitude, region.latitudeDelta, region.longitude, region.longitudeDelta, selectedAmenity]);

  const initialMapRegion = useMemo(() => {
    const venueWithRealCoords = venues.find((venue) => venue.latitude && venue.longitude);
    if (!venueWithRealCoords) return KRAKOW_REGION;
    return {
      latitude: venueWithRealCoords.latitude,
      longitude: venueWithRealCoords.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }, [venues]);

  const askAndCenterOnUser = useCallback(async () => {
    if (Platform.OS === 'web') {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('loading');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationStatus('denied');
      return;
    }
    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const next = {
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    };
    const centeredRegion = {
      latitude: next.latitude,
      longitude: next.longitude,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };
    setUserLocation(next);
    setRegion(centeredRegion);
    mapRef.current?.animateToRegion(centeredRegion, 500);
    setLocationStatus('granted');
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (hasAutoLocated) return;
    setHasAutoLocated(true);
    void askAndCenterOnUser();
  }, [askAndCenterOnUser, hasAutoLocated]);

  const renderItem = useCallback(
    ({ item }: { item: SearchVenue }) => {
      const highlightReason =
        selectedAmenity === 'withTeam' && item.hasTeam
          ? 'Matches team filter'
          : selectedAmenity === 'withReviews' && item.hasReviews
            ? 'Matches reviews filter'
            : selectedAmenity === 'withAddress' && Boolean(item.serviceLabel && item.serviceLabel !== 'Book your next service')
              ? 'Matches address filter'
              : null;
      return (
        <SearchVenueCard
          venue={item}
          fonts={fonts}
          highlightReason={highlightReason}
          onPress={onPressVenue ? () => onPressVenue(item) : undefined}
        />
      );
    },
    [fonts, onPressVenue, selectedAmenity]
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.sheetHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FILTERS.map((label, i) => (
            <Pressable
              key={label}
              style={({ pressed }) => [
                styles.chip,
                i < FILTERS.length - 1 && styles.chipSpacing,
                fadePressed(pressed),
              ]}
              onPress={() => {
                if (label === 'Sort') {
                  setSortByName((prev) => !prev);
                  return;
                }
                if (label === 'Price') {
                  const current = PRICE_OPTIONS.findIndex((value) => value === maxPrice);
                  const next = PRICE_OPTIONS[(current + 1) % PRICE_OPTIONS.length] ?? null;
                  setMaxPrice(next);
                  return;
                }
                if (label === 'Amenities') {
                  setAmenityIdx((prev) => (prev + 1) % AMENITY_OPTIONS.length);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${label}`}
            >
              <Text style={[styles.chipText, { fontFamily: fonts.semibold }]}>{label}</Text>
              <Ionicons
                name={label === 'Sort' && sortByName ? 'checkmark' : 'chevron-down'}
                size={15}
                color={colors.textMuted}
              />
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.activeFilterRow}>
          <Text style={[styles.activeFilterText, { fontFamily: fonts.regular }]}>
            {maxPrice != null ? `Price <= ${maxPrice} CZK` : 'Price: any'}
          </Text>
          <Text style={[styles.activeFilterText, { fontFamily: fonts.regular }]}>
            Amenity:{' '}
            {amenityLabel(selectedAmenity)}
          </Text>
        </View>
        <Text style={[styles.resultCount, { fontFamily: fonts.regular }]}>
          {venues.length} venues in map area
        </Text>
      </View>
    ),
    [amenityIdx, fonts, maxPrice, selectedAmenity, sortByName, venues.length]
  );

  const mapEl =
    Platform.OS === 'web' ? (
      <View style={[styles.mapFallback, StyleSheet.absoluteFill]}>
        {venues.map((venue) => {
          const left = Math.min(330, Math.max(24, 160 + (venue.longitude - 19.94) * 2200));
          const top = Math.min(430, Math.max(32, 220 - (venue.latitude - 50.06) * 2600));
          return (
            <View key={venue.id} style={[styles.webMarkerWrap, { left, top }]}>
              <SalonMarkerDot highlighted={isAmenityMatch(venue)} />
            </View>
          );
        })}
      </View>
    ) : (
      <View style={StyleSheet.absoluteFill}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialMapRegion}
          onRegionChangeComplete={setRegion}
          showsPointsOfInterest
          showsBuildings
          showsUserLocation
        >
          {userLocation ? (
            <Marker coordinate={userLocation} title="You are here" pinColor="#2563eb" />
          ) : null}
          {venues.map((v) => (
            <Marker
              key={v.id}
              coordinate={{ latitude: v.latitude, longitude: v.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
            >
              <SalonMarkerDot highlighted={isAmenityMatch(v)} />
            </Marker>
          ))}
        </MapView>
        <View style={[styles.myLocationWrap, { bottom: listBottomPad + 130 }]}>
          <Pressable
            style={({ pressed }) => [styles.myLocationBtn, fadePressed(pressed, 0.9)]}
            onPress={askAndCenterOnUser}
            accessibilityRole="button"
            accessibilityLabel="Show my location"
          >
            <Ionicons
              name={locationStatus === 'loading' ? 'time-outline' : locationStatus === 'granted' ? 'locate' : 'locate-outline'}
              size={20}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>
    );

  return (
    <View style={styles.root}>
      {mapEl}

      <View style={[styles.searchBarWrap, { top: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <View style={styles.searchIconCircle}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search salons or services"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { fontFamily: fonts.regular }]}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Pressable
            style={({ pressed }) => [styles.filterRound, fadePressed(pressed)]}
            onPress={() => {
              if (query) setQuery('');
              else {
                setMaxPrice(null);
                setAmenityIdx(0);
              }
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={query ? 'Clear search text' : 'Clear active filters'}
          >
            <Ionicons name={query ? 'close' : 'options-outline'} size={21} color={colors.text} />
          </Pressable>
        </View>
        {selectedAmenity ? (
          <View style={styles.mapLegend}>
            <View style={styles.mapLegendDot} />
            <Text style={[styles.mapLegendText, { fontFamily: fonts.semibold }]}>
              Highlighted markers match {amenityLabel(selectedAmenity)} filter
            </Text>
          </View>
        ) : null}
      </View>

      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        enableOverDrag={false}
        bottomInset={0}
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={styles.handleIndicator}
        style={styles.sheetContainer}
      >
        <BottomSheetFlatList
          data={venues}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPad }]}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyTitle, { fontFamily: fonts.semibold }]}>No venues in this area</Text>
              <Text style={[styles.emptyBody, { fontFamily: fonts.regular }]}>
                Move the map or try another area to find salons.
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  sheetContainer: {
    zIndex: 2,
    elevation: 10,
  },
  mapFallback: {
    backgroundColor: '#dce2ea',
  },
  webMarkerWrap: {
    position: 'absolute',
    transform: [{ translateX: -20 }, { translateY: -10 }],
  },
  searchBarWrap: {
    position: 'absolute',
    left: spacing.screenHorizontal,
    right: spacing.screenHorizontal,
    zIndex: 15,
  },
  myLocationWrap: {
    position: 'absolute',
    right: spacing.screenHorizontal - 2,
    zIndex: 1,
  },
  myLocationBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 5,
  },
  searchIconCircle: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 6,
  },
  searchPrimary: {
    fontSize: 16,
    letterSpacing: -0.2,
    color: colors.text,
  },
  searchSecondary: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  filterRound: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLegend: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(124,58,237,0.35)',
  },
  mapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c3aed',
    marginRight: 7,
  },
  mapLegendText: {
    fontSize: 12,
    color: colors.text,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#111827',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  markerDotHighlighted: {
    backgroundColor: '#7c3aed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  sheetBg: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  handleIndicator: {
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#d8dce3',
  },
  sheetHeader: {
    paddingBottom: 4,
    paddingTop: 2,
  },
  activeFilterRow: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  chipsRow: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ebebeb',
    backgroundColor: '#fafafa',
  },
  chipSpacing: {
    marginRight: 8,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
    marginRight: 5,
    letterSpacing: -0.2,
  },
  resultCount: {
    textAlign: 'center',
    fontSize: 13,
    letterSpacing: -0.1,
    color: colors.textMuted,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
  },
  emptyWrap: {
    paddingTop: 36,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    color: colors.text,
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
