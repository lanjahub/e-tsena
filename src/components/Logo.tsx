import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  G,
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  colors?: readonly [string, string, ...string[]];
  animated?: boolean;
  variant?: 'full' | 'compact' | 'icon';
  showBackground?: boolean;
}

export const Logo = ({
  size = 60,
  colors = ['#7143b5', '#2D9596'],
  animated = false,
  variant = 'full',
  showBackground = false,
}: LogoProps) => {
  const primary = colors[0] || '#7143b5';
  const secondary = colors[1] || '#2D9596';

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (animated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();

      Animated.loop(
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ).start();
    }
  }, [animated, glowAnim, scaleAnim]);

  const AnimatedView = Animated.createAnimatedComponent(View);

  // ========================================
  // 🎯 LOGO ICON - Panier professionnel premium
  // ========================================
  if (variant === 'icon') {
    return (
      <AnimatedView
        style={{
          width: size,
          height: size,
          transform: [{ scale: scaleAnim }],
          opacity: glowAnim.interpolate({
            inputRange: [0.6, 1],
            outputRange: [0.8, 1],
          }),
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
          <Defs>
            <LinearGradient
              id="logoGradIcon"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <Stop offset="0%" stopColor={primary} />
              <Stop offset="50%" stopColor={secondary} />
              <Stop offset="100%" stopColor={primary} />
            </LinearGradient>
            <LinearGradient
              id="shineGrad"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Cercle de fond élégant */}
          {showBackground && (
            <Circle cx="50" cy="50" r="46" fill="url(#logoGradIcon)" opacity="0.1" />
          )}

          {/* Anse du panier - design moderne */}
          <Path
            d="M 30 42 Q 30 15 50 15 Q 70 15 70 42"
            fill="none"
            stroke="url(#logoGradIcon)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Corps du panier - forme premium */}
          <Path
            d="M 22 42 L 78 42 L 75 82 Q 74 90 66 90 L 34 90 Q 26 90 25 82 Z"
            fill="url(#logoGradIcon)"
          />

          {/* Effet 3D - ombre interne */}
          <Path
            d="M 25 45 L 75 45 Q 74 48 50 46 Q 26 48 25 45"
            fill="#000000"
            opacity="0.15"
          />

          {/* Reflet brillant supérieur */}
          <Path
            d="M 28 48 L 72 48 L 71 52 L 29 52 Z"
            fill="url(#shineGrad)"
            opacity="0.5"
          />

          {/* Motif moderne - lignes verticales */}
          <Path
            d="M 35 58 L 33 78"
            stroke="#FFFFFF"
            strokeWidth="2"
            opacity="0.3"
            strokeLinecap="round"
          />
          <Path
            d="M 50 58 L 50 80"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            opacity="0.4"
            strokeLinecap="round"
          />
          <Path
            d="M 65 58 L 67 78"
            stroke="#FFFFFF"
            strokeWidth="2"
            opacity="0.3"
            strokeLinecap="round"
          />

          {/* Point lumineux - effet premium */}
          <Circle cx="58" cy="25" r="3" fill="#FFFFFF" opacity="0.6" />
          <Circle cx="58" cy="25" r="1.5" fill="#FFFFFF" opacity="0.9" />
        </Svg>
      </AnimatedView>
    );
  }

  // ========================================
  // LOGO COMPLET (full / compact)
  // ========================================
  return (
    <AnimatedView
      style={{
        width: size,
        height: size,
        transform: [{ scale: scaleAnim }],
        opacity: glowAnim.interpolate({
          inputRange: [0.6, 1],
          outputRange: [0.8, 1],
        }),
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 120 120" fill="none">
        <Defs>
          <LinearGradient
            id="logoGradFull"
            x1="0%"
            y1="0%"
            x2="120%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={primary} />
            <Stop offset="50%" stopColor={secondary} />
            <Stop offset="100%" stopColor={primary} />
          </LinearGradient>

          {/* Filtre ombre douce (web / svg) */}
          <filter id="dropShadow">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </Defs>

        {/* Anse courbe premium */}
        <Path
          d="M 32 58 Q 32 18 60 18 Q 88 18 88 58"
          fill="none"
          stroke="url(#logoGradFull)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#dropShadow)"
        />

        {/* Panier principal - formes arrondies */}
        <Path
          d="M 20 58 L 100 58 L 92 110 Q 90 116 82 116 L 38 116 Q 30 116 28 110 Z"
          fill="url(#logoGradFull)"
          filter="url(#dropShadow)"
        />

        {/* Reflet brillant premium */}
        <Path
          d="M 28 62 L 92 62 Q 90 66 60 56 Q 30 66 28 62"
          fill="#FFFFFF"
          opacity="0.45"
        />

        {/* Reflet dégradé sur côtés */}
        <Path
          d="M 22 65 L 25 110 Q 28 112 32 112 L 32 65"
          fill="#FFFFFF"
          opacity="0.12"
        />
        <Path
          d="M 98 65 L 95 110 Q 92 112 88 112 L 98 65"
          fill="#FFFFFF"
          opacity="0.12"
        />

        {/* Ligne séparation interne */}
        <Path
          d="M 28 80 Q 60 77 92 80"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          opacity="0.2"
          strokeLinecap="round"
        />

        {/* Petite décoration en bas */}
        <Circle cx="35" cy="112" r="2.5" fill="#FFFFFF" opacity="0.35" />
        <Circle cx="60" cy="115" r="2" fill="#FFFFFF" opacity="0.3" />
        <Circle cx="85" cy="112" r="2.5" fill="#FFFFFF" opacity="0.35" />
      </Svg>
    </AnimatedView>
  );
};

// ============================================
// 🛒 MINI LOGO - Panier avec "e" élégant
// ============================================
export const MiniLogo = ({
  size = 24,
  color = '#7C3AED',
}: {
  size?: number;
  color?: string;
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Defs>
        <LinearGradient
          id={`miniGrad-${color.replace('#', '')}`}
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <Stop offset="0" stopColor={color} />
          <Stop offset="1" stopColor={color} stopOpacity="0.85" />
        </LinearGradient>
      </Defs>

      {/* Anse du panier */}
      <Path
        d="M13 14 Q13 4 22 4 Q31 4 31 14"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Corps du panier */}
      <Path
        d="M7 14 L37 14 L34 38 Q33 42 28 42 L16 42 Q11 42 10 38 Z"
        fill={color}
      />

      {/* Reflet */}
      <Path
        d="M9 16 L35 16 L34 20 Q22 14 10 20 Z"
        fill="#fff"
        opacity="0.35"
      />

      {/* Papier Plane Design (Replacing the 'e') pour matcher l'image */}
      <Path
        d="M14 34 L28 26 L18 24 L20 30 Z"
        fill="#FFFFFF" 
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Trailing line of plane */}
      <Path
        d="M10 36 Q13 34 15 34"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </Svg>
  );
};

// ============================================
// 🏆 LOGO HEADER E-tsena (Style Photo Ref)
// Panier blanc plein + Texte E-tsena + Slogan
// ============================================
export const HeaderLogo = ({ size = 52 }: { size?: number }) => {
  return (
    <View style={headerStyles.container}>
      {/* Icône panier blanc rempli (simple) */}
      <View style={{ marginRight: 12 }}>
         <Svg width="36" height="36" viewBox="0 0 24 24" fill="none">
             <Path 
               d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" 
               stroke="#FFFFFF" 
               strokeWidth="2" 
               strokeLinecap="round" 
               strokeLinejoin="round" 
               fill="#FFFFFF"
               fillOpacity="0.2"
             />
             <Circle cx="9" cy="21" r="1" fill="#FFFFFF" />
             <Circle cx="20" cy="21" r="1" fill="#FFFFFF" />
         </Svg>
      </View>

      {/* Texte E-tsena */}
      <View>
        <Text style={headerStyles.brandNameEtsena}>
          E-tsena
        </Text>
      </View>
    </View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandNameEtsena: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});