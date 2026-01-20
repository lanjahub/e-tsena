import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
  Circle,
  G
} from 'react-native-svg';

// Couleurs du dégradé pour le MiniLogo
const COLOR_PURPLE = '#7C3AED';
const COLOR_PINK = '#db2777';

interface LogoProps {
  size?: number;
  color?: string;
}

/**
 * Le dessin du Caddie (Chariot)
 */
const CartShape = ({ color, idSuffix = '' }: { color?: string, idSuffix?: string }) => {
  // Si une couleur est donnée (ex: blanc), on l'utilise, sinon on utilise le dégradé
  const fillUrl = color ? color : `url(#grad${idSuffix})`;
  
  return (
    <>
      <Defs>
        <LinearGradient id={`grad${idSuffix}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={COLOR_PURPLE} />
          <Stop offset="1" stopColor={COLOR_PINK} />
        </LinearGradient>
      </Defs>

      <G fill={fillUrl}>
        {/* Le corps du chariot (forme pleine) */}
        <Path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zM17 18c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
      </G>
    </>
  );
};

// ========================================
// 1. MINI LOGO (Pour les cartes/listes)
// ========================================
export const MiniLogo = ({ size = 30, color }: LogoProps) => {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width="100%" height="100%" viewBox="0 0 24 24">
        {/* On force le dégradé si aucune couleur n'est fournie */}
        <CartShape color={color} idSuffix="Mini" />
      </Svg>
    </View>
  );
};

// ========================================
// 2. HEADER LOGO (Comme sur la photo)
// ========================================
export const HeaderLogo = ({ size = 50 }: LogoProps) => {
  return (
    <View style={styles.headerContainer}>
      {/* Icône Caddie Blanche */}
      <View style={{ width: 42, height: 42, marginRight: 10 }}>
        <Svg width="100%" height="100%" viewBox="0 0 24 24">
             <CartShape color="#FFFFFF" />
        </Svg>
      </View>

      {/* Textes */}
      <View style={{ flexDirection: 'column', justifyContent: 'center' }}>
        {/* Titre E-tsena */}
        <Svg height="24" width="120">
           <SvgText
            x="0"
            y="20"
            fontSize="22"
            fontWeight="900"
            fill="#FFFFFF"
            fontFamily="System"
          >
            E-tsena
          </SvgText>
        </Svg>
        
        {/* Sous-titre "Votre assistant courses" */}
        <Svg height="16" width="180">
           <SvgText
            x="0"
            y="12"
            fontSize="11"
            fontWeight="500"
            fill="#FFFFFF"
            opacity="0.9"
            fontFamily="System"
          >
            
          </SvgText>
        </Svg>
      </View>
    </View>
  );
};

// Logo inutilisé mais gardé pour éviter les erreurs d'import si utilisé ailleurs
export const Logo = ({ size = 100 }: LogoProps) => <MiniLogo size={size} />;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
});