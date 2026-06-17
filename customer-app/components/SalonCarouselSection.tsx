import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { typography } from '../constants/design';
import { spacing } from '../constants/theme';
import type { SalonCardItem } from '../types/discovery';
import { SalonCard } from './SalonCard';

type Props = {
  title: string;
  data: SalonCardItem[];
  fonts: { regular: string; semibold: string; bold: string };
  onPressSalon?: (id: string) => void;
};

export function SalonCarouselSection({ title, data, fonts, onPressSalon }: Props) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.round(width * 0.72);

  return (
    <View style={styles.section}>
      <Text style={[typography.sectionHeading, styles.sectionHeading, { fontFamily: fonts.bold }]}>
        {title}
      </Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <SalonCard
            salon={item}
            width={cardWidth}
            fonts={fonts}
            onPress={onPressSalon ? () => onPressSalon(item.id) : undefined}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sectionGap,
  },
  sectionHeading: {
    marginBottom: 14,
  },
  rowContent: {
    paddingRight: spacing.screenHorizontal,
  },
});
