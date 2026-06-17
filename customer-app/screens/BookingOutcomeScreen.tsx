import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FontFamilies } from '../types/fonts';

type Props = {
  type: 'accepted' | 'cancelled';
  fonts: FontFamilies;
  onDone: () => void;
};

export function BookingOutcomeScreen({ type, fonts, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const title = type === 'accepted' ? 'Appointment confirmed' : 'Appointment cancelled';
  const tickScale = useRef(new Animated.Value(0.6)).current;
  const tickOpacity = useRef(new Animated.Value(0)).current;
  const tickRotate = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(tickOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(tickScale, {
          toValue: 1.18,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(tickScale, {
          toValue: 1,
          damping: 9,
          stiffness: 180,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(tickRotate, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [tickOpacity, tickRotate, tickScale]);

  return (
    <Pressable style={styles.root} onPress={onDone}>
      <LinearGradient
        colors={['#f8f9fb', '#e9dcff', '#7a3cff', '#9dc4ff', '#f8f9fb']}
        locations={[0, 0.22, 0.52, 0.76, 1]}
        start={{ x: 0.08, y: 0.02 }}
        end={{ x: 0.92, y: 0.98 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <Animated.View
          style={{
            opacity: tickOpacity,
            transform: [
              { scale: tickScale },
              {
                rotate: tickRotate.interpolate({
                  inputRange: [-12, 0],
                  outputRange: ['-12deg', '0deg'],
                }),
              },
            ],
          }}
        >
          <Ionicons name="checkmark" size={74} color="#f4f5f6" />
        </Animated.View>
        <Text style={[styles.title, { fontFamily: fonts.bold }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 24,
    fontSize: 36,
    lineHeight: 42,
    color: '#f2f3f5',
    textAlign: 'center',
    letterSpacing: -0.2,
    textShadowColor: 'rgba(30, 30, 30, 0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
