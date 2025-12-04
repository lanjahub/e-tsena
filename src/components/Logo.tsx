import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G } from 'react-native-svg';

interface LogoProps {
  size?: number;
  colors?: readonly [string, string, ...string[]];
  animated?: boolean;
}

export const Logo = ({ size = 44, colors = ['#FF5722', '#FF9800'], animated = false }: LogoProps) => {
  const c1 = colors[0] || '#FF5722';
  const c2 = colors[1] || '#FF9800';

  // Animation de respiration (scale)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated]);

  const AnimatedView = Animated.createAnimatedComponent(View);

  return (
    <AnimatedView style={{ width: size, height: size, transform: [{ scale: scaleAnim }] }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
        </Defs>
        
        <G>
           {/* Structure principale (Poignée + Support) */}
           <Path 
             d="M15 25 C 25 22, 32 35, 35 50 Q 38 75, 60 78 L 85 75" 
             stroke="url(#grad)" 
             strokeWidth="8" 
             strokeLinecap="round"
             fill="none"
           />

           {/* Corps du panier (Forme pleine) */}
           <Path
             d="M38 35 L 92 28 L 86 68 C 86 68, 85 72, 60 72 L 42 72 L 38 35 Z"
             fill="url(#grad)"
           />
           
           {/* Swoosh (La courbe blanche dynamique) */}
           <Path 
             d="M 45 68 Q 65 65, 88 32 L 92 28 L 92 50 Q 75 75, 48 72 Z" 
             fill="#fff" 
             opacity="0.9"
           />
           
           {/* Roues */}
           <Circle cx="50" cy="88" r="8" fill="url(#grad)" />
           <Circle cx="80" cy="85" r="8" fill="url(#grad)" />
        </G>
      </Svg>
    </AnimatedView>
  );
};