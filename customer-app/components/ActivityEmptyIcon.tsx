import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View } from 'react-native';

const SIZE = 100;

/**
 * Large calendar mark with purple → blue → fade, matching empty-state art direction.
 */
export function ActivityEmptyIcon() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webWrap}>
        <LinearGradient
          colors={['#7c3aed', '#3b82f6', 'rgba(255,255,255,0.85)']}
          locations={[0, 0.42, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.webGradient}
        >
          <Ionicons name="calendar" size={SIZE} color="rgba(255,255,255,0.95)" />
        </LinearGradient>
      </View>
    );
  }

  return (
    <MaskedView
      style={styles.mask}
      maskElement={
        <View style={styles.maskInner}>
          <Ionicons name="calendar" size={SIZE} color="#000000" />
        </View>
      }
    >
      <LinearGradient
        colors={['#7c3aed', '#3b82f6', 'rgba(255,255,255,0)']}
        locations={[0, 0.42, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  mask: {
    width: SIZE,
    height: SIZE,
    marginBottom: 8,
  },
  maskInner: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webWrap: {
    width: SIZE,
    height: SIZE,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  webGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
