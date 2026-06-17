import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fadePressed, shadow } from '../constants/design';
import { colors } from '../constants/theme';
import type { SearchVenue } from '../types/discovery';
import type { FontFamilies } from '../types/fonts';

type Props = {
  venue: SearchVenue;
  fonts: FontFamilies;
  highlightReason?: string | null;
  onPress?: () => void;
};

const DOTS = 3;

export function SearchVenueCard({ venue, fonts, highlightReason, onPress }: Props) {
  const reviews = venue.reviews.toLocaleString('fr-FR');
  const hasRealRating = venue.rating !== 'NEW' && venue.reviews > 0;
  const qualityTags = [
    venue.minPriceCzk != null ? `From ${Math.round(venue.minPriceCzk)} CZK` : null,
    venue.hasTeam ? 'Team available' : null,
    venue.hasReviews ? 'Reviewed' : 'No reviews yet',
  ].filter(Boolean) as string[];

  const body = (
    <View style={[styles.imageWrap, highlightReason && styles.imageWrapHighlighted]}>
      <Image
        source={{ uri: venue.image }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.06)', 'rgba(0,0,0,0.78)']}
        locations={[0.34, 1]}
        style={styles.overlay}
      />
      <View style={styles.dots}>
        {Array.from({ length: DOTS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === 0 ? styles.dotActive : styles.dotIdle,
              i > 0 && styles.dotSpace,
            ]}
          />
        ))}
      </View>
      <View style={styles.infoInCard}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { fontFamily: fonts.bold }]} numberOfLines={2}>
            {venue.name}
          </Text>
          <View style={styles.ratingBlock}>
            {hasRealRating ? (
              <>
                <Ionicons name="star" size={13} color={colors.star} style={styles.starIcon} />
                <Text style={[styles.rating, { fontFamily: fonts.semibold }]}>
                  {venue.rating} ({reviews})
                </Text>
              </>
            ) : (
              <Text style={[styles.rating, { fontFamily: fonts.semibold }]}>NEW</Text>
            )}
          </View>
        </View>
        <Text style={[styles.service, { fontFamily: fonts.regular }]} numberOfLines={1}>
          {venue.serviceLabel}
        </Text>
        <View style={styles.pricePill}>
          <Text style={[styles.price, { fontFamily: fonts.semibold }]}>{venue.priceFrom}</Text>
        </View>
        <View style={styles.tagRow}>
          {qualityTags.map((tag) => (
            <View key={tag} style={styles.tagPill}>
              <Text style={[styles.tagText, { fontFamily: fonts.semibold }]}>{tag}</Text>
            </View>
          ))}
        </View>
        {highlightReason ? (
          <View style={styles.matchPill}>
            <Ionicons name="sparkles-outline" size={12} color="#ffffff" />
            <Text style={[styles.matchText, { fontFamily: fonts.semibold }]}>{highlightReason}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, fadePressed(pressed)]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${venue.name}, rated ${venue.rating}`}
      >
        {body}
      </Pressable>
    );
  }

  return <View style={styles.card}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 24,
  },
  imageWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...shadow.card,
  },
  imageWrapHighlighted: {
    borderColor: 'rgba(124,58,237,0.85)',
    borderWidth: 1.2,
  },
  image: {
    width: '100%',
    aspectRatio: 1.35,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotSpace: {
    marginLeft: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotActive: {
    backgroundColor: '#fff',
  },
  dotIdle: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  infoInCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
  },
  title: {
    flex: 1,
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 22,
    paddingRight: 12,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 2,
  },
  starIcon: {
    marginRight: 4,
  },
  rating: {
    fontSize: 12,
    color: '#f1f5f9',
  },
  service: {
    fontSize: 13,
    color: '#e2e8f0',
    marginTop: 7,
  },
  pricePill: {
    marginTop: 9,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124,58,237,0.9)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  price: {
    fontSize: 12,
    color: '#ffffff',
  },
  tagRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    backgroundColor: 'rgba(15,23,42,0.68)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tagText: {
    color: '#f8fafc',
    fontSize: 11,
  },
  matchPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.92)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  matchText: {
    marginLeft: 5,
    color: '#fff',
    fontSize: 11,
  },
});
