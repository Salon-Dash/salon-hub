import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Change this to your salon / app name (lowercase matches the reference style). */
export const BRAND_NAME = 'fresha';

type SplashScreenProps = {
  title?: string;
  /** Loaded via `useFonts` (e.g. Plus Jakarta Sans Bold). */
  fontFamily?: string;
};

export function SplashScreen({ title = BRAND_NAME, fontFamily }: SplashScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Base diagonal wash: white edges → rich purple center */}
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['#ffffff', '#f5f0ff', '#7c3aed', '#a78bfa', '#ffffff']}
        locations={[0, 0.22, 0.48, 0.72, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
      />

      {/* Sky blue glow — middle-left */}
      <LinearGradient
        style={[StyleSheet.absoluteFill, { opacity: 0.85 }]}
        colors={['rgba(147,197,253,0.95)', 'rgba(147,197,253,0.35)', 'transparent', 'transparent']}
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.75, y: 0.65 }}
      />

      {/* Lavender — middle-right */}
      <LinearGradient
        style={[StyleSheet.absoluteFill, { opacity: 0.9 }]}
        colors={['transparent', 'transparent', 'rgba(196,181,253,0.5)', 'rgba(167,139,250,0.75)']}
        locations={[0, 0.4, 0.7, 1]}
        start={{ x: 0.25, y: 0.4 }}
        end={{ x: 1, y: 0.6 }}
      />

      {/* Light top edge so status bar stays readable with dark content */}
      <LinearGradient
        style={[styles.statusBarFade, { height: 56 + insets.top }]}
        colors={['rgba(255,255,255,0.55)', 'transparent']}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={[styles.wordmark, fontFamily != null && { fontFamily }]}>{title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  statusBarFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    color: '#FFFFFF',
    fontSize: 44,
    letterSpacing: -0.5,
    fontWeight: '700',
    textShadowColor: 'rgba(124, 58, 237, 0.35)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 24,
  },
});
