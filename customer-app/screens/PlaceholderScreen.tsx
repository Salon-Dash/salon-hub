import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import type { FontFamilies } from '../types/fonts';

type Props = {
  title: string;
  fonts: FontFamilies;
};

export function PlaceholderScreen({ title, fonts }: Props) {
  return (
    <View style={styles.root}>
      <Text style={[styles.title, { fontFamily: fonts.bold }]}>{title}</Text>
      <Text style={[styles.sub, { fontFamily: fonts.regular }]}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    color: colors.text,
  },
  sub: {
    marginTop: 8,
    fontSize: 15,
    color: colors.textMuted,
  },
});
