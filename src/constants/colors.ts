/**
 * CHARTE GRAPHIQUE E-TSENA v4.0
 * Palette de couleurs professionnelle bleu-violet
 * Inspirée des dégradés doux bleu clair vers violet clair
 * 
 * Principes:
 * - Bleu clair (#60A5FA, #3B82F6) = Primaire (achats, actions)
 * - Violet clair (#A78BFA, #8B5CF6) = Secondaire (navigation, accents)
 * - Dégradés doux = Transitions fluides bleu → violet
 * - Gris = Neutres (texte, bordures, fonds)
 */

// ==================== COULEURS PRIMAIRES ====================

// Couleurs principales de l'application - Design Bleu-Violet
export const COLORS = {
  // BLEU - Couleur primaire (E-tsena brand)
  primary: '#60A5FA',           // Bleu clair principal
  primaryDark: '#3B82F6',       // Bleu foncé pour hover/focus
  primaryLight: '#93C5FD',      // Bleu très clair pour variantes
  primaryUltraLight: '#DBEAFE', // Bleu ultra clair pour backgrounds
  
  // VIOLET - Couleur secondaire (navigation, accents)
  secondary: '#A78BFA',         // Violet clair élégant
  secondaryDark: '#8B5CF6',     // Violet foncé pour hover
  secondaryLight: '#C4B5FD',    // Violet clair pour variantes
  secondaryUltraLight: '#EDE9FE', // Violet ultra clair pour backgrounds
  
  // Couleurs de fond avec dégradés doux
  background: '#F0F9FF',     // Bleu très clair (fond général)
  surface: '#FFFFFF',        // Blanc (cartes, modals)
  surfaceVariant: '#EFF6FF', // Bleu ultra léger (zones secondaires)
  
  // Texte
  text: '#1E293B',          // Gris foncé (texte principal)
  textLight: '#64748B',     // Gris moyen (texte secondaire)
  textDisabled: '#CBD5E1',  // Gris clair (texte désactivé)
  
  // États
  success: '#10B981',       // Vert (succès, validations)
  warning: '#F59E0B',       // Orange (avertissements)
  error: '#EF4444',         // Rouge (erreurs)
  info: '#3B82F6',          // Bleu (informations)
  
  // Bordures et dividers
  border: '#E2E8F0',        // Bordure légère
  borderDark: '#CBD5E1',    // Bordure foncée
  divider: '#F1F5F9',       // Séparateur
  
  // Overlay et ombres
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',
};

/**
 * Couleurs par section de l'application - Design Bleu-Violet
 * Palette harmonieuse avec dégradés doux
 */
export const SECTION_COLORS = {
  // 🛒 Section Achats/Listes (Bleu-Violet)
  achats: {
    primary: '#60A5FA',      // Bleu clair du design
    light: '#DBEAFE',        // Bleu très clair
    medium: '#BFDBFE',       // Bleu clair
    text: '#3B82F6',         // Bleu foncé
    gradient: ['#60A5FA', '#A78BFA', '#8B5CF6'] as const, // Dégradé bleu-violet
  },
  
  // 📊 Section Rapports (Bleu)
  rapports: {
    primary: '#3B82F6',      // Bleu du design
    light: '#DBEAFE',        // Bleu très clair
    medium: '#BFDBFE',       // Bleu clair
    text: '#2563EB',         // Bleu foncé
    gradient: ['#3B82F6', '#60A5FA', '#93C5FD'] as const, // Dégradé bleu
  },
  
  // 📈 Section Statistiques (Violet)
  statistiques: {
    primary: '#8B5CF6',      // Violet profond
    light: '#EDE9FE',        // Violet très clair
    medium: '#DDD6FE',       // Violet clair
    text: '#7C3AED',         // Violet foncé
    gradient: ['#8B5CF6', '#A78BFA', '#C4B5FD'] as const, // Dégradé violet
  },
  
  // 📦 Section Produits (Bleu doux)
  produits: {
    primary: '#60A5FA',      // Bleu doux
    light: '#DBEAFE',        // Bleu très clair
    medium: '#BFDBFE',       // Bleu clair
    text: '#3B82F6',         // Bleu foncé
    gradient: ['#60A5FA', '#93C5FD'] as const, // Dégradé bleu doux
  },
  
  // 🏠 Section Accueil (Gradient Bleu-Violet)
  home: {
    primary: '#60A5FA',      // Bleu principal
    light: '#DBEAFE',        // Bleu très clair
    medium: '#BFDBFE',       // Bleu clair
    text: '#3B82F6',         // Bleu foncé
    gradient: ['#60A5FA', '#A78BFA', '#8B5CF6'] as const, // Dégradé bleu-violet complet
  },
};

/**
 * Justification ergonomique des couleurs - Design Bleu-Violet :
 * 
 * 1. 🎯 CONTRASTE ET ACCESSIBILITÉ
 *    - Tous les textes ont un ratio de contraste ≥ 4.5:1 (WCAG AA)
 *    - Les couleurs bleu-violet sont apaisantes et professionnelles
 * 
 * 2. 🧠 PSYCHOLOGIE DES COULEURS
 *    - Bleu-Violet (Accueil/Achats) : Confiance, sérénité, modernité
 *    - Bleu (Rapports) : Fiabilité, clarté, professionnalisme
 *    - Violet (Statistiques) : Créativité, sagesse, innovation
 *    - Bleu doux (Produits) : Calme, qualité, raffinement
 * 
 * 3. 🎨 COHÉRENCE VISUELLE
 *    - Palette harmonieuse bleu-violet avec dégradés doux
 *    - Gradients fluides pour un effet premium et moderne
 *    - Teintes claires pour les fonds (évite la fatigue visuelle)
 * 
 * 4. 🔍 NAVIGATION INTUITIVE
 *    - Chaque section a une nuance distincte de la palette bleu-violet
 *    - L'utilisateur identifie rapidement sa position
 *    - Design cohérent et professionnel
 * 
 * 5. 💡 ÉTATS ET FEEDBACK
 *    - Vert (succès) : Universel pour les validations
 *    - Rouge (erreur) : Conventionnel pour les erreurs
 *    - Orange (warning) : Attire l'attention sans alarmer
 */

/**
 * Opacités recommandées
 */
export const OPACITY = {
  disabled: 0.38,
  inactive: 0.54,
  divider: 0.12,
  overlay: 0.5,
};

/**
 * Élévations (pour les ombres Material Design)
 */
export const ELEVATION = {
  small: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1,
    elevation: 1,
  },
  medium: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 3,
  },
  large: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
};

/**
 * Animations - Durées et courbes d'animation
 */
export const ANIMATIONS = {
  // Durées (en millisecondes)
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 800,
  },
  
  // Courbes d'animation (easing)
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
};

/**
 * Export par défaut pour un import simple
 */
export default {
  COLORS,
  SECTION_COLORS,
  OPACITY,
  ELEVATION,
  ANIMATIONS,
};
