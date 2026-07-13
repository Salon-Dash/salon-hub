import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { fadePressed, typography } from '../constants/design';
import { colors, spacing } from '../constants/theme';
import type { CategoryTile } from '../types/discovery';

type Props = {
  fonts: { regular: string; semibold: string; bold: string };
  categories: CategoryTile[];
  /** Opens the browse/search surface. Wired to the tiles + "See all". */
  onSelect?: () => void;
};

const GAP = 12;

export function TopCategoriesSection({ fonts, categories, onSelect }: Props) {
  const { width } = useWindowDimensions();
  const pad = spacing.screenHorizontal * 2;
  const itemWidth = (width - pad - GAP * 2) / 3;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[typography.sectionHeading, { fontFamily: fonts.bold }]}>Top categories</Text>
        <Pressable
          hitSlop={12}
          onPress={onSelect}
          style={({ pressed }) => fadePressed(pressed)}
          accessibilityRole="button"
          accessibilityLabel="See all categories"
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
              styles.cell,
              {
                width: itemWidth,
                marginRight: (index + 1) % 3 === 0 ? 0 : GAP,
              },
              fadePressed(pressed),
            ]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <Image
              source={{ uri: item.image }}
              style={styles.circle}
              contentFit="cover"
            />
            <Text style={[styles.label, { fontFamily: fonts.regular }]} numberOfLines={2}>
              {item.label}
            </Text>
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
    marginBottom: 18,
  },
  seeAll: {
    fontSize: 15,
    color: colors.accent,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    marginBottom: 20,
    alignItems: 'center',
  },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f3f4f6',
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 2,
  },
});
