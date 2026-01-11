import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Text as SvgText, G, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface AnimatedLogoProps {
  size?: number;
  showAnimation?: boolean;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 120, showAnimation = true }) => {
  const { activeTheme } = useTheme();
  const basketBounce = useRef(new Animated.Value(0)).current;
  const productOpacity = useRef(new Animated.Value(0)).current;
  const productFloat = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (showAnimation) {
      // Logo entrance animation avec bounce
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 120,
        friction: 10,
        useNativeDriver: true,
      }).start();

      // Animation du panier plus douce et attractive
      const basketAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(basketBounce, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(basketBounce, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      // Animation des produits plus subtile
      const productAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(productOpacity, {
            toValue: 0.8,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(productOpacity, {
            toValue: 0.3,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      );

      // Animation de flottement plus fluide
      const floatingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(productFloat, {
            toValue: 1,
            duration: 3500,
            useNativeDriver: true,
          }),
          Animated.timing(productFloat, {
            toValue: 0,
            duration: 3500,
            useNativeDriver: true,
          }),
        ])
      );

      basketAnimation.start();
      productAnimation.start();
      floatingAnimation.start();

      return () => {
        basketAnimation.stop();
        productAnimation.stop();
        floatingAnimation.stop();
      };
    }
  }, [showAnimation]);

  const basketTransform = basketBounce.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6], // Mouvement plus subtil
  });

  const productTransform = productFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12], // Mouvement plus subtil
  });

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: logoScale }] }]}>
      {/* Background gradient circle plus élégant */}
      <LinearGradient
        colors={[activeTheme.primary + '20', activeTheme.secondary + '15', activeTheme.primary + '10']}
        style={[styles.backgroundCircle, { width: size * 0.95, height: size * 0.95 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Main SVG Logo E-TSENA avec panier et cercle externe */}
      <Svg height={size} width={size} viewBox="0 0 120 120" style={styles.svg}>
        <Defs>
          <SvgLinearGradient id="basketGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={activeTheme.primary + 'DD'} />
            <Stop offset="50%" stopColor={activeTheme.primary + 'BB'} />
            <Stop offset="100%" stopColor={activeTheme.primary + '99'} />
          </SvgLinearGradient>
          <SvgLinearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={activeTheme.primary} />
            <Stop offset="100%" stopColor={activeTheme.secondary} />
          </SvgLinearGradient>
          <SvgLinearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={activeTheme.primary + '25'} />
            <Stop offset="100%" stopColor={activeTheme.secondary + '30'} />
          </SvgLinearGradient>
          <SvgLinearGradient id="handleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={activeTheme.primary + 'FF'} />
            <Stop offset="100%" stopColor={activeTheme.primary + 'CC'} />
          </SvgLinearGradient>
        </Defs>

        {/* Cercle externe plus visible pour E-TSENA */}
        <Circle
          cx="60"
          cy="60"
          r="55"
          fill="url(#circleGradient)"
          stroke={activeTheme.primary + '60'}
          strokeWidth="3"
        />

        {/* Panier avec "E" à l'intérieur pour E-TSENA - centré à gauche */}
        <Animated.View style={{ transform: [{ translateY: basketTransform }] }}>
          <G>
            {/* Corps du panier plus large pour bien contenir le "E" */}
            <Path
              d="M28 48 L58 48 L61 78 L25 78 Z"
              fill="url(#basketGradient)"
              stroke={activeTheme.primary + 'FF'}
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            
            {/* Poignées du panier */}
            <Path
              d="M32 48 Q37 36 42 48"
              fill="none"
              stroke="url(#handleGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <Path
              d="M47 48 Q52 36 57 48"
              fill="none"
              stroke="url(#handleGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Détails décoratifs du panier */}
            <Path
              d="M30 56 L59 56"
              stroke={activeTheme.primary + '50'}
              strokeWidth="1.5"
            />
            <Path
              d="M31 65 L58 65"
              stroke={activeTheme.primary + '50'}
              strokeWidth="1.5"
            />

            {/* Lettre "E" grande et stylée dans le panier */}
            <SvgText
              x="43"
              y="68"
              fontSize="26"
              fontWeight="900"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="Arial, sans-serif"
              stroke={activeTheme.primary + '99'}
              strokeWidth="1"
            >
              E
            </SvgText>
          </G>
        </Animated.View>

        {/* Tiret "-" entre E et TSENA */}
        <Path
          d="M65 62 L72 62"
          stroke={activeTheme.primary}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Texte "TSENA" à côté (à droite du tiret) */}
        <SvgText
          x="88"
          y="68"
          fontSize="18"
          fontWeight="800"
          textAnchor="middle"
          fill="url(#textGradient)"
          fontFamily="Arial, sans-serif"
          letterSpacing="1.8"
        >
          TSENA
        </SvgText>

        {/* Petits points décoratifs sous le logo E-TSENA */}
        <Circle
          cx="43"
          cy="88"
          r="2.5"
          fill={activeTheme.primary + '70'}
        />
        <Circle
          cx="52"
          cy="88"
          r="2.5"
          fill={activeTheme.primary + '70'}
        />
        <Circle
          cx="61"
          cy="88"
          r="2.5"
          fill={activeTheme.primary + '70'}
        />
      </Svg>

      {/* Floating products around basket */}
      <Animated.View 
        style={[
          styles.floatingProduct, 
          styles.product1,
          { 
            opacity: productOpacity,
            transform: [{ translateY: productTransform }]
          }
        ]}
      >
        <LinearGradient
          colors={['#4ECDC4', '#44A08D']}
          style={styles.productCircle}
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.floatingProduct, 
          styles.product2,
          { 
            opacity: productOpacity,
            transform: [{ translateY: productTransform }]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFB347', '#FF8C42']}
          style={styles.productCircle}
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.floatingProduct, 
          styles.product3,
          { 
            opacity: productOpacity,
            transform: [{ translateY: productTransform }]
          }
        ]}
      >
        <LinearGradient
          colors={['#9B59B6', '#8E44AD']}
          style={styles.productCircle}
        />
      </Animated.View>

      <Animated.View 
        style={[
          styles.floatingProduct, 
          styles.product4,
          { 
            opacity: productOpacity,
            transform: [{ translateY: productTransform }]
          }
        ]}
      >
        <LinearGradient
          colors={['#E74C3C', '#C0392B']}
          style={styles.productCircle}
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  svg: {
    position: 'relative',
    zIndex: 2,
  },
  floatingProduct: {
    position: 'absolute',
    zIndex: 1,
  },
  productCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  product1: {
    top: 15,
    right: 20,
  },
  product2: {
    top: 35,
    left: 15,
  },
  product3: {
    bottom: 30,
    right: 15,
  },
  product4: {
    bottom: 15,
    left: 25,
  },
});