import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../lib/theme';

export type OrbState = 'idle' | 'recording' | 'thinking' | 'speaking';

const GRADIENTS: Record<OrbState, [string, string]> = {
  idle: ['#141a38', colors.irisDeep],
  recording: ['#26307a', colors.iris],
  thinking: ['#1a2040', '#6a79c9'],
  speaking: ['#202a63', colors.iris],
};

/**
 * Orbe central simplificado: un círculo con gradiente que "respira".
 * Grabando respira rápido y brilla más; en reposo, lento y tenue.
 */
export function Orb({ state }: { state: OrbState }) {
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const duration = state === 'recording' ? 800 : state === 'thinking' ? 1400 : 2600;
    breath.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state, breath]);

  const scale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1, state === 'recording' ? 1.12 : 1.05],
  });
  const glow = breath.interpolate({
    inputRange: [0, 1],
    outputRange: state === 'recording' ? [0.5, 0.95] : [0.25, 0.5],
  });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.halo, { opacity: glow, transform: [{ scale }] }]} />
      <Animated.View style={[styles.orb, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={GRADIENTS[state]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const SIZE = 148;

const styles = StyleSheet.create({
  wrap: {
    width: SIZE + 48,
    height: SIZE + 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: SIZE + 40,
    height: SIZE + 40,
    borderRadius: (SIZE + 40) / 2,
    borderWidth: 1,
    borderColor: colors.iris,
  },
  orb: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  gradient: {
    flex: 1,
  },
});
