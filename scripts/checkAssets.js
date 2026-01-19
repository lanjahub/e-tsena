const fs = require('node:fs');
const { exec } = require('node:child_process');
const path = require('node:path');

console.log('\n🎨 Génération des images du splash screen...\n');

// Vérifier si les images existent déjà
const assetsDir = path.join(__dirname, '..', 'assets');
const requiredImages = [
  'icon.png',
  'splash.png',
  'adaptive-icon.png',
  'notification-icon.png'
];

const missingImages = requiredImages.filter(img => 
  !fs.existsSync(path.join(assetsDir, img))
);

if (missingImages.length > 0) {
  console.log('⚠️  Images manquantes :');
  missingImages.forEach(img => console.log(`   - ${img}`));
  console.log('\n📋 Vous avez plusieurs options :\n');
  console.log('1. GÉNÉRATION AUTOMATIQUE AVEC EXPO');
  console.log('   npm install -g @expo/image-utils sharp');
  console.log('   npx expo-splash-screen --help\n');
  console.log('2. CRÉER MANUELLEMENT');
  console.log('   Utilisez un outil comme Figma, Canva, ou Adobe Express');
  console.log('   Fond blanc (#FFFFFF) + Logo violet (#7C3AED)\n');
  console.log('3. UTILISER UN GÉNÉRATEUR EN LIGNE');
  console.log('   https://icon.kitchen/');
  console.log('   https://appicon.co/\n');
} else {
  console.log('✅ Toutes les images requises sont présentes !\n');
  requiredImages.forEach(img => console.log(`   ✓ ${img}`));
}

console.log('\n📱 Pour builder l\'application :\n');
console.log('DÉVELOPPEMENT (APK local) :');
console.log('  eas build --profile development --platform android --local\n');
console.log('PREVIEW (APK pour tests) :');
console.log('  eas build --profile preview --platform android\n');
console.log('PRODUCTION (AAB pour Google Play) :');
console.log('  eas build --profile production --platform android\n');
