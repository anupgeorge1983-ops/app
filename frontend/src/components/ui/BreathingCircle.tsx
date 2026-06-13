import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export function BreathingCircle() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scale]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.outer, { transform: [{ scale }] }]}>
        <Animated.View style={[styles.mid, { transform: [{ scale }] }]}>
          <View style={styles.inner} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(201,135,122,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mid: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(201,135,122,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(201,135,122,0.25)',
  },
});
