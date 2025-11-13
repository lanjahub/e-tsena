/**
 * CHARTE GRAPHIQUE E-TSENA v3.1
 * Palette de couleurs professionnelle rose-violet
 * 
 * Principes:
 * - Rose (#EC4899) = Primaire (achats, actions)
 * - Violet (#A855F7) = Secondaire (navigation, accents)
 * - Orange (#F59E0B) = Accentuation (notifications, stats)
 * - Gris = Neutres (texte, bordures, fonds)
 */

// ==================== COULEURS PRIMAIRES ====================

// Couleurs principales de l'application - Design Rose-Violet
export const COLORS = {
  // ROSE - Couleur primaire (E-tsena brand)
  primary: '#EC4899',           // Rose vif principal
  primaryDark: '#BE185D',       // Rose foncé pour hover/focus
  primaryLight: '#F472B6',      // Rose clair pour variantes
  primaryUltraLight: '#FDF2F8', // Rose très clair pour backgrounds
  
  // VIOLET - Couleur secondaire (navigation, accents)
  secondary: '#A855F7',         // Violet élégant
  secondaryDark: '#7E22CE',     // Violet foncé pour hover
  secondaryLight: '#D8B4FE',    // Violet clair pour variantes
  secondaryUltraLight: '#F3E8FF', // Violet très clair pour backgrounds
  
  // Couleurs de fond
  background: '#f8fafc',     // Gris très clair (fond général)
  surface: '#ffffff',        // Blanc (cartes, modals)
  surfaceVariant: '#f1f5f9', // Gris léger (zones secondaires)
  
  // Texte
  text: '#1e293b',          // Gris foncé (texte principal)
  textLight: '#64748b',     // Gris moyen (texte secondaire)
  textDisabled: '#cbd5e1',  // Gris clair (texte désactivé)
  
  // États
  success: '#10b981',       // Vert (succès, validations)
  warning: '#f59e0b',       // Orange (avertissements)
  error: '#ef4444',         // Rouge (erreurs)
  info: '#3b82f6',          // Bleu (informations)
  
  // Bordures et dividers
  border: '#e2e8f0',        // Bordure légère
  borderDark: '#cbd5e1',    // Bordure foncée
  divider: '#f1f5f9',       // Séparateur
  
  // Overlay et ombres
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',
};

/**
 * Couleurs par section de l'application - Design Rose-Violet
 * Palette harmonieuse inspirée du design moderne
 */
export const SECTION_COLORS = {
  // 🛒 Section Achats/Listes (Rose-Violet)
  achats: {
    primary: '#A855F7',      // Violet du design
    light: '#F3E8FF',        // Violet très clair
    medium: '#E9D5FF',       // Violet clair
    text: '#7C3AED',         // Violet foncé
    gradient: ['#EC4899', '#A855F7', '#8B5CF6'] as const, // Dégradé rose-violet
  },
  
  // 📊 Section Rapports (Rose)
  rapports: {
    primary: '#EC4899',      // Rose du design
    light: '#FCE7F3',        // Rose très clair
    medium: '#FBCFE8',       // Rose clair
    text: '#DB2777',         // Rose foncé
    gradient: ['#EC4899', '#DB2777'] as const, // Dégradé rose
  },
  
  // 📈 Section Statistiques (Violet)
  statistiques: {
    primary: '#8B5CF6',      // Violet profond
    light: '#EDE9FE',        // Violet très clair
    medium: '#DDD6FE',       // Violet clair
    text: '#6B21A8',         // Violet foncé
    gradient: ['#8B5CF6', '#7C3AED'] as const, // Dégradé violet
  },
  
  // 📦 Section Produits (Rose doux)
  produits: {
    primary: '#F472B6',      // Rose doux
    light: '#FCE7F3',        // Rose très clair
    medium: '#FBCFE8',       // Rose clair
    text: '#BE185D',         // Rose foncé
    gradient: ['#F472B6', '#EC4899'] as const, // Dégradé rose doux
  },
  
  // 🏠 Section Accueil (Gradient Rose-Violet)
  home: {
    primary: '#A855F7',      // Violet principal
    light: '#F3E8FF',        // Violet très clair
    medium: '#E9D5FF',       // Violet clair
    text: '#7C3AED',         // Violet foncé
    gradient: ['#EC4899', '#A855F7', '#8B5CF6'] as const, // Dégradé rose-violet complet
  },
};

/**
 * Justification ergonomique des couleurs - Design Rose-Violet :
 * 
 * 1. 🎯 CONTRASTE ET ACCESSIBILITÉ
 *    - Tous les textes ont un ratio de contraste ≥ 4.5:1 (WCAG AA)
 *    - Les couleurs rose-violet sont modernes et élégantes
 * 
 * 2. 🧠 PSYCHOLOGIE DES COULEURS
 *    - Rose-Violet (Accueil/Achats) : Créativité, élégance, modernité
 *    - Rose (Rapports) : Énergie, passion, attention aux détails
 *    - Violet (Statistiques) : Innovation, sagesse, insights
 *    - Rose doux (Produits) : Douceur, qualité, raffinement
 * 
 * 3. 🎨 COHÉRENCE VISUELLE
 *    - Palette harmonieuse rose-violet inspirée du design moderne
 *    - Gradients fluides pour un effet premium
 *    - Teintes claires pour les fonds (évite la fatigue visuelle)
 * 
 * 4. 🔍 NAVIGATION INTUITIVE
 *    - Chaque section a une nuance distincte de la palette rose-violet
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
 * Export par défaut pour un import simple
 */
export default {
  COLORS,
  SECTION_COLORS,
  OPACITY,
  ELEVATION,
};
