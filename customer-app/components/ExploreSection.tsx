import { Image } from 'expo-image';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { fadePressed, typography } from '../constants/design';
import { colors, spacing } from '../constants/theme';
import type { CategoryTile } from '../types/discovery';

type Props = {
  fonts: { regular: string; semibold: string; bold: string };
  categories: CategoryTile[];
  /** Opens the browse/search surface. Wired to the tiles + "See all". */
  onSelect?: () => void;
};

export function ExploreSection({ fonts, categories, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const horizontalPadding = spacing.screenHorizontal;
  const gap = 10;
  const colWidth = (width - horizontalPadding * 2 - gap) / 2;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[typography.sectionHeading, { fontFamily: fonts.bold }]}>Explore</Text>
        <Pressable
          hitSlop={12}
          onPress={onSelect}
          style={({ pressed }) => fadePressed(pressed)}
          accessibilityRole="button"
          accessibilityLabel="See all explore categories"
        >
          <Text style={[styles.seeAll, { fontFamily: fonts.semibold }]}>See all</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {categories.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={onSelect}
              style={({ pressed }) => [
                styles.tile,
                {
                  width: colWidth,
                  marginBottom: gap,
                  marginRight: index % 2 === 0 ? gap : 0,
                },
                fadePressed(pressed),
              ]}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View style={[styles.tileInner, { backgroundColor: item.color }]}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.tileImage}
                  contentFit="cover"
                />
                <View style={styles.tileOverlay} />
                <Text style={[styles.tileLabel, { fontFamily: fonts.bold }]}>{item.label}</Text>
              </View>
            </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sectionGap,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 15,
    color: colors.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {},
  tileInner: {
    borderRadius: 16,
    overflow: 'hidden',
    aspectRatio: 0.85,
    justifyContent: 'flex-end',
  },
  tileImage: {
    ...StyleSheet.absoluteFillObject,
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  tileLabel: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    right: 12,
    color: '#ffffff',
    fontSize: 16,
    letterSpacing: -0.2,
  },
});
