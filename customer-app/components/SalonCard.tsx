import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fadePressed, radius, shadow } from '../constants/design';
import { colors } from '../constants/theme';
import type { SalonCardItem } from '../types/discovery';

type Props = {
  salon: SalonCardItem;
  width: number;
  fonts: { regular: string; semibold: string; bold: string };
  onPress?: () => void;
};

export function SalonCard({ salon, width, fonts, onPress }: Props) {
  const reviewsFormatted = salon.reviews.toLocaleString('fr-FR');

  const inner = (
    <View style={styles.imageShell}>
      <Image
        source={{ uri: salon.image }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.78)']}
        locations={[0.35, 1]}
        style={styles.overlay}
      />
      <View style={styles.contentInCard}>
        <Text style={[styles.name, { fontFamily: fonts.bold }]} numberOfLines={2}>
          {salon.name}
        </Text>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color={colors.star} style={styles.starIc} />
          <Text style={[styles.rating, { fontFamily: fonts.semibold }]}>{salon.rating}</Text>
          <Text style={[styles.reviews, { fontFamily: fonts.regular }]}>({reviewsFormatted})</Text>
        </View>
        <Text style={[styles.meta, { fontFamily: fonts.regular }]} numberOfLines={1}>
          {salon.location}
        </Text>
        <Text style={[styles.meta, { fontFamily: fonts.regular }]} numberOfLines={1}>
          {salon.category}
        </Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, { width }, fadePressed(pressed)]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${salon.name}, ${salon.rating} stars, ${salon.location}`}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={[styles.card, { width }]}>{inner}</View>;
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
  },
  imageShell: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    ...shadow.card,
  },
  image: {
    width: '100%',
    aspectRatio: 1.24,
    backgroundColor: '#f3f4f6',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentInCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
  },
  name: {
    fontSize: 17,
    color: '#ffffff',
    lineHeight: 21,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  starIc: {
    marginRight: 4,
  },
  rating: {
    fontSize: 13,
    color: '#ffffff',
  },
  reviews: {
    fontSize: 13,
    color: '#e2e8f0',
    marginLeft: 4,
  },
  meta: {
    fontSize: 12,
    color: '#f1f5f9',
    marginTop: 3,
  },
});
