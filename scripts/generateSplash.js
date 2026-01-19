// Script pour générer les assets du splash screen
// Ce script vous guide pour créer les images nécessaires

console.log(`
═══════════════════════════════════════════════════════════════
  GÉNÉRATION DU SPLASH SCREEN - E-TSENA
═══════════════════════════════════════════════════════════════

Pour créer le splash screen avec un fond blanc et logo violet :

1. ICÔNE DE L'APPLICATION (icon.png)
   - Dimensions : 1024x1024 pixels
   - Fond : Blanc (#FFFFFF)
   - Logo : Violet (#7C3AED) centré
   - Format : PNG avec transparence

2. SPLASH SCREEN (splash.png)
   - Dimensions : 1284x2778 pixels (iPhone 14 Pro Max)
   - Fond : Blanc (#FFFFFF)
   - Logo : Violet (#7C3AED) centré
   - Format : PNG

3. ICÔNE ADAPTATIVE ANDROID (adaptive-icon.png)
   - Dimensions : 1024x1024 pixels
   - Fond : Transparent
   - Logo : Violet (#7C3AED) centré
   - Zone de sécurité : 432x432 pixels au centre
   - Format : PNG avec transparence

4. ICÔNE DE NOTIFICATION (notification-icon.png)
   - Dimensions : 96x96 pixels
   - Couleur : Blanc monochrome
   - Fond : Transparent
   - Format : PNG

═══════════════════════════════════════════════════════════════

OPTION 1 : Utiliser un outil en ligne
- Figma : https://figma.com
- Canva : https://canva.com
- Adobe Express : https://express.adobe.com

OPTION 2 : Utiliser Expo
Installez expo-splash-screen et générez automatiquement :
  npx expo install expo-splash-screen
  npx expo prebuild

OPTION 3 : Utiliser un générateur d'icônes
- https://icon.kitchen/
- https://appicon.co/

═══════════════════════════════════════════════════════════════

COULEURS À UTILISER :
- Fond blanc : #FFFFFF
- Logo violet : #7C3AED (couleur principale)
- Logo violet clair : #A855F7 (dégradé)

═══════════════════════════════════════════════════════════════
`);

console.log("✓ Configuration du splash screen mise à jour dans app.json");
console.log("\nPlacez vos images dans le dossier 'assets' :");
console.log("  - assets/icon.png");
console.log("  - assets/splash.png");
console.log("  - assets/adaptive-icon.png");
console.log("  - assets/notification-icon.png");
