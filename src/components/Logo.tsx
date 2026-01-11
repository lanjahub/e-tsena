import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, G, Text as SvgText, Mask, Rect } from 'react-native-svg';

interface LogoProps {
  size?: number;
  colors?: readonly [string, string, ...string[]];
  animated?: boolean;
  variant?: 'full' | 'compact' | 'icon';
  showBackground?: boolean;
}

export const Logo = ({ 
  size = 44, 
  colors = ['#7C3AED', '#A855F7'], 
  animated = false,
  variant = 'full',
  showBackground = false
}: LogoProps) => {
  const c1 = colors[0] || '#7C3AED';
  const c2 = colors[1] || '#A855F7';

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

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

      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -3,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated]);

  const AnimatedView = Animated.createAnimatedComponent(View);

  // Variante ICON - Logo moderne professionnel
  if (variant === 'icon') {
    return (
      <AnimatedView 
        style={{ 
          width: size, 
          height: size, 
          transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] 
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 80 80" fill="none">
          <Defs>
            <LinearGradient id="circleGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </LinearGradient>
            <LinearGradient id="cartGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>
          
          {/* Cercle principal avec gradient */}
          <Circle cx="40" cy="40" r="38" fill="url(#circleGrad)" />
          <Circle cx="40" cy="40" r="38" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.3" />
          
          {/* Panier professionnel moderne */}
          <G transform="translate(20, 18)">
            {/* Corps du panier */}
            <Path 
              d="M6 16 L34 16 L31 38 Q30.5 40 28 40 L12 40 Q9.5 40 9 38 Z" 
              fill="url(#cartGrad)"
              stroke="url(#cartGrad)"
              strokeWidth="0.5"
            />
            
            {/* Poign\u00e9e du panier */}
            <Path 
              d="M10 16 Q10 8 20 8 Q30 8 30 16" 
              fill="none" 
              stroke="url(#cartGrad)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            
            {/* D\u00e9tails du panier - lignes verticales */}
            <Path d="M14 18 L13 36" stroke="url(#cartGrad)" strokeWidth="1" opacity="0.4" />
            <Path d="M20 18 L19 37" stroke="url(#cartGrad)" strokeWidth="1" opacity="0.4" />
            <Path d="M26 18 L25 36" stroke="url(#cartGrad)" strokeWidth="1" opacity="0.4" />
          </G>
          
          {/* Texte "e-tsena" moderne */}
          <G transform="translate(40, 56)">
            <SvgText
              x="0"
              y="0"
              fontSize="10"
              fontWeight="700"
              fill="#FFFFFF"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system"
            >
              e-tsena
            </SvgText>
          </G>
          
          {/* Point d'accent sur le "e" */}
          <Circle cx="27" cy="53" r="1.5" fill="#FFFFFF" opacity="0.9" />
        </Svg>
      </AnimatedView>
    );
  }

  // Variante COMPACT - Logo moderne avec cercle
  if (variant === 'compact') {
    return (
      <AnimatedView 
        style={{ 
          width: size, 
          height: size, 
          transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] 
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 80 80" fill="none">
          <Defs>
            <LinearGradient id="circleGradCompact" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c1} />
              <Stop offset="1" stopColor={c2} />
            </LinearGradient>
            <LinearGradient id="cartGradCompact" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>
          
          {showBackground && (
            <>
              <Circle cx="40" cy="40" r="37" fill={c1} fillOpacity="0.1" />
              <Circle cx="40" cy="40" r="37" fill="none" stroke={c1} strokeWidth="1" opacity="0.2" />
            </>
          )}
          
          {/* Cercle principal */}
          <Circle cx="40" cy="40" r="34" fill="url(#circleGradCompact)" />
          <Circle cx="40" cy="40" r="34" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.3" />
          
          {/* Panier */}
          <G transform="translate(20, 16)">
            <Path 
              d="M6 16 L34 16 L31 38 Q30.5 40 28 40 L12 40 Q9.5 40 9 38 Z" 
              fill="url(#cartGradCompact)"
            />
            <Path 
              d="M10 16 Q10 8 20 8 Q30 8 30 16" 
              fill="none" 
              stroke="url(#cartGradCompact)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            <Path d="M14 18 L13 36" stroke="url(#cartGradCompact)" strokeWidth="1" opacity="0.4" />
            <Path d="M20 18 L19 37" stroke="url(#cartGradCompact)" strokeWidth="1" opacity="0.4" />
            <Path d="M26 18 L25 36" stroke="url(#cartGradCompact)" strokeWidth="1" opacity="0.4" />
          </G>
          
          {/* Texte */}
          <G transform="translate(40, 56)">
            <SvgText
              x="0"
              y="0"
              fontSize="9"
              fontWeight="700"
              fill="#FFFFFF"
              textAnchor="middle"
            >
              e-tsena
            </SvgText>
          </G>
          
          <Circle cx="27" cy="53" r="1.5" fill="#FFFFFF" opacity="0.9" />
        </Svg>
      </AnimatedView>
    );
  }

  // Variante FULL - Logo grand format professionnel
  return (
    <AnimatedView 
      style={{ 
        width: size, 
        height: size, 
        transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] 
      }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id="circleGradFull" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} />
            <Stop offset="1" stopColor={c2} />
          </LinearGradient>
          <LinearGradient id="cartGradFull" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.9" />
          </LinearGradient>
          <LinearGradient id="bgGradFull" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c1} stopOpacity="0.12" />
            <Stop offset="1" stopColor={c2} stopOpacity="0.08" />
          </LinearGradient>
        </Defs>
        
        {showBackground && (
          <>
            <Circle cx="50" cy="50" r="48" fill="url(#bgGradFull)" />
            <Circle cx="50" cy="50" r="46" fill="none" stroke={c1} strokeWidth="1.5" opacity="0.25" />
          </>
        )}
        
        {/* Cercle principal avec ombre */}
        <Circle cx="50" cy="52" r="44" fill="#000000" opacity="0.08" />
        <Circle cx="50" cy="50" r="44" fill="url(#circleGradFull)" />
        <Circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.3" />
        
        {/* Panier professionnel */}
        <G transform="translate(25, 20)">
          <Path 
            d="M8 20 L42 20 L38 48 Q37 51 33 51 L17 51 Q13 51 12 48 Z" 
            fill="url(#cartGradFull)"
            stroke="url(#cartGradFull)"
            strokeWidth="0.5"
          />
          
          <Path 
            d="M12 20 Q12 10 25 10 Q38 10 38 20" 
            fill="none" 
            stroke="url(#cartGradFull)" 
            strokeWidth="3" 
            strokeLinecap="round"
          />
          
          {/* D\u00e9tails verticaux */}
          <Path d="M17 22 L16 45" stroke="url(#cartGradFull)" strokeWidth="1.5" opacity="0.4" />
          <Path d="M25 22 L24 47" stroke="url(#cartGradFull)" strokeWidth="1.5" opacity="0.4" />
          <Path d="M33 22 L32 45" stroke="url(#cartGradFull)" strokeWidth="1.5" opacity="0.4" />
          
          {/* Reflet */}
          <Path 
            d="M10 22 L40 22 Q30 18 20 22 Z" 
            fill="#FFFFFF" 
            opacity="0.15"
          />
        </G>
        
        {/* Texte "e-tsena" professionnel */}
        <G transform="translate(50, 72)">
          <SvgText
            x="0"
            y="0"
            fontSize="13"
            fontWeight="800"
            fill="#FFFFFF"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system"
            letterSpacing="0.5"
          >
            e-tsena
          </SvgText>
        </G>
        
        {/* Point d'accent */}
        <Circle cx="33" cy="68" r="2" fill="#FFFFFF" opacity="0.95" />
        
        {/* Lueur subtile */}
        <Circle cx="50" cy="50" r="42" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.15" />
      </Svg>
    </AnimatedView>
  );
};

// ============================================
// 🛒 MINI LOGO POUR LES CARDS
// ============================================
export const MiniLogo = ({ size = 24, color = '#7C3AED' }: { size?: number; color?: string }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <Mask id={`eMaskMini-${size}-${color.replace('#', '')}`}>
          <Rect x="0" y="0" width="40" height="40" fill="white" />
          <G transform="translate(11, 16)">
            <Path 
              d="M8 5 Q8 1 12 1 Q16 1 16 5 Q16 8 13 8 L5 8"
              fill="none"
              stroke="black"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path 
              d="M5 8 Q4 13 9 14 Q13 15 16 11"
              fill="none"
              stroke="black"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>
        </Mask>
      </Defs>
      
      <G mask={`url(#eMaskMini-${size}-${color.replace('#', '')})`}>
        <Path 
          d="M6 12 L34 12 L31 34 Q30 38 26 38 L14 38 Q10 38 9 34 Z" 
          fill={color}
        />
      </G>
      
      <Path 
        d="M11 12 Q11 3 20 3 Q29 3 29 12" 
        fill="none" 
        stroke={color} 
        strokeWidth="2.5" 
        strokeLinecap="round"
      />
    </Svg>
  );
};

// ============================================
// 🛒 HEADER LOGO BLANC POUR FOND COLORÉ
// ============================================
export const HeaderLogo = ({ size = 58 }: { size?: number }) => {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ 
        width: size, 
        height: size, 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginRight: 6,
      }}>
        <Svg width={size} height={size} viewBox="0 0 70 70">
          <Defs>
            <Mask id="eMaskHeader">
              <Rect x="0" y="0" width="70" height="70" fill="white" />
              <G transform="translate(22, 28)">
                <Path 
                  d="M13 8 Q13 2 20 2 Q27 2 27 8 Q27 12 22 12 L8 12"
                  fill="none"
                  stroke="black"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path 
                  d="M8 12 Q6 20 15 22 Q22 23 27 18"
                  fill="none"
                  stroke="black"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </G>
            </Mask>
          </Defs>
          
          <G transform="translate(3, 3)" opacity="0.15">
            <Path 
              d="M12 22 L58 22 L53 58 Q52 63 46 63 L24 63 Q18 63 17 58 Z" 
              fill="#000"
            />
            <Path 
              d="M19 22 Q19 6 35 6 Q51 6 51 22" 
              fill="none" 
              stroke="#000" 
              strokeWidth="4"
            />
          </G>
          
          <G mask="url(#eMaskHeader)">
            <Path 
              d="M10 20 L60 20 L55 58 Q54 64 47 64 L23 64 Q16 64 15 58 Z" 
              fill="#FFFFFF"
            />
          </G>
          
          <Path 
            d="M18 20 Q18 4 35 4 Q52 4 52 20" 
            fill="none" 
            stroke="#FFFFFF" 
            strokeWidth="4" 
            strokeLinecap="round"
          />
          
          <Path 
            d="M10 20 L60 20 L55 58 Q54 64 47 64 L23 64 Q16 64 15 58 Z" 
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          
          <Circle cx="25" cy="42" r="4" fill="rgba(255,255,255,0.2)" />
          <Circle cx="45" cy="42" r="4" fill="rgba(255,255,255,0.2)" />
          <Circle cx="35" cy="52" r="3.5" fill="rgba(255,255,255,0.15)" />
        </Svg>
      </View>
      
      <View style={{ marginLeft: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ 
            fontSize: size * 0.48, 
            fontWeight: '300', 
            color: '#FFFFFF',
            opacity: 0.95,
            marginRight: 4,
          }}>
            -
          </Text>
          <Text style={{ 
            fontSize: size * 0.46, 
            fontWeight: '800', 
            color: '#FFFFFF',
            letterSpacing: 1,
            textShadowColor: 'rgba(0,0,0,0.25)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
          }}>
            tsena
          </Text>
        </View>
        <View style={{
          height: 2.5,
          backgroundColor: 'rgba(255,255,255,0.4)',
          borderRadius: 2,
          width: '90%',
          alignSelf: 'flex-end',
          marginTop: 3,
        }} />
      </View>
    </View>
  );
};