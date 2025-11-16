import { Animated, Easing } from 'react-native';
import { ANIMATIONS } from '@constants/colors';

/**
 * Utilitaires d'animation pour l'application
 * Animations douces compatibles avec le design bleu-violet
 */

/**
 * Animation de fade in/out
 */
export const fadeIn = (value: Animated.Value, duration: number = ANIMATIONS.duration.normal) => {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
};

export const fadeOut = (value: Animated.Value, duration: number = ANIMATIONS.duration.normal) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  });
};

/**
 * Animation de slide
 */
export const slideInUp = (value: Animated.Value, duration: number = ANIMATIONS.duration.normal) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
};

export const slideOutDown = (value: Animated.Value, duration: number = ANIMATIONS.duration.normal) => {
  return Animated.timing(value, {
    toValue: 300,
    duration,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  });
};

/**
 * Animation de scale (zoom)
 */
export const scaleIn = (value: Animated.Value, duration: number = ANIMATIONS.duration.normal) => {
  return Animated.spring(value, {
    toValue: 1,
    friction: 8,
    tension: 40,
    useNativeDriver: true,
  });
};

export const scaleOut = (value: Animated.Value, duration: number = ANIMATIONS.duration.fast) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  });
};

/**
 * Animation de pulse (battement)
 */
export const pulse = (value: Animated.Value) => {
  return Animated.sequence([
    Animated.timing(value, {
      toValue: 1.1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: 1,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Animation de shake (secousse)
 */
export const shake = (value: Animated.Value) => {
  return Animated.sequence([
    Animated.timing(value, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: -10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: 10,
      duration: 50,
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: 0,
      duration: 50,
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Animation de rotation
 */
export const rotate = (value: Animated.Value, duration: number = 1000) => {
  return Animated.loop(
    Animated.timing(value, {
      toValue: 1,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    })
  );
};

/**
 * Animation combinée (fade + scale)
 */
export const fadeScaleIn = (
  fadeValue: Animated.Value,
  scaleValue: Animated.Value,
  duration: number = ANIMATIONS.duration.normal
) => {
  return Animated.parallel([
    fadeIn(fadeValue, duration),
    scaleIn(scaleValue, duration),
  ]);
};

/**
 * Animation de bounce (rebond)
 */
export const bounce = (value: Animated.Value) => {
  return Animated.sequence([
    Animated.timing(value, {
      toValue: 1.2,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: 0.9,
      duration: 150,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: 1.05,
      duration: 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }),
    Animated.timing(value, {
      toValue: 1,
      duration: 100,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }),
  ]);
};

/**
 * Animation de slide depuis le bas (pour modals)
 */
export const slideInFromBottom = (
  value: Animated.Value,
  duration: number = ANIMATIONS.duration.normal
) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  });
};

export const slideOutToBottom = (
  value: Animated.Value,
  duration: number = ANIMATIONS.duration.normal
) => {
  return Animated.timing(value, {
    toValue: 1000,
    duration,
    easing: Easing.in(Easing.cubic),
    useNativeDriver: true,
  });
};


