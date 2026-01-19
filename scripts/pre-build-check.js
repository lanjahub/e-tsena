#!/usr/bin/env node

/**
 * Script de vérification pré-build
 * Vérifie que tout est prêt avant de lancer un build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const requiredAssets = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'splash.png', size: 1284 },
  { name: 'notification-icon.png', size: 96 }
];

console.log('\n🔍 Vérification Pré-Build E-tsena\n');
console.log('='.repeat(60));

let errors = 0;
let warnings = 0;

// 1. Vérifier Node.js
console.log('\n📦 Vérification de l\'environnement...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  
  if (majorVersion < 16) {
    console.log('❌ Node.js version trop ancienne:', nodeVersion);
    console.log('   Minimum requis: v16.x');
    errors++;
  } else {
    console.log('✅ Node.js:', nodeVersion);
  }
} catch (e) {
  console.log('❌ Node.js non installé');
  errors++;
}

// 2. Vérifier npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log('✅ npm:', npmVersion);
} catch (e) {
  console.log('❌ npm non installé');
  errors++;
}

// 3. Vérifier EAS CLI
console.log('\n🛠️  Vérification des outils de build...');
try {
  execSync('eas --version', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ EAS CLI installé');
} catch (e) {
  console.log('⚠️  EAS CLI non installé');
  console.log('   Installer avec: npm install -g eas-cli');
  warnings++;
}

// 4. Vérifier les node_modules
console.log('\n📚 Vérification des dépendances...');
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ node_modules présent');
} else {
  console.log('❌ node_modules manquant');
  console.log('   Lancer: npm install');
  errors++;
}

// 5. Vérifier les assets
console.log('\n🎨 Vérification des assets...');
for (const asset of requiredAssets) {
  const assetPath = path.join(ASSETS_DIR, asset.name);
  
  if (!fs.existsSync(assetPath)) {
    console.log(`❌ ${asset.name} manquant (${asset.size}x${asset.size})`);
    errors++;
  } else {
    const stats = fs.statSync(assetPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    
    // Vérifier que c'est bien un PNG et pas un SVG
    const content = fs.readFileSync(assetPath, 'utf8');
    if (content.startsWith('<?xml') || content.startsWith('<svg')) {
      console.log(`⚠️  ${asset.name} est un SVG, pas un PNG`);
      console.log(`   Convertir avec: npm run convert-icons`);
      warnings++;
    } else {
      console.log(`✅ ${asset.name} (${sizeKB} KB)`);
    }
  }
}

// 6. Vérifier app.json
console.log('\n⚙️  Vérification de la configuration...');
const appJsonPath = path.join(__dirname, '..', 'app.json');
try {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const expo = appJson.expo;
  
  console.log(`✅ App name: ${expo.name}`);
  console.log(`✅ Version: ${expo.version}`);
  console.log(`✅ Version code: ${expo.android.versionCode}`);
  
  // Vérifier que les chemins d'assets existent
  const iconPath = path.join(__dirname, '..', expo.icon);
  const splashPath = path.join(__dirname, '..', expo.splash.image);
  
  if (!fs.existsSync(iconPath)) {
    console.log(`⚠️  Icône configurée mais fichier manquant: ${expo.icon}`);
    warnings++;
  }
  
  if (!fs.existsSync(splashPath)) {
    console.log(`⚠️  Splash configuré mais fichier manquant: ${expo.splash.image}`);
    warnings++;
  }
} catch (e) {
  console.log('❌ Erreur lors de la lecture de app.json:', e.message);
  errors++;
}

// 7. Vérifier TypeScript
console.log('\n📝 Vérification du code TypeScript...');
try {
  execSync('npm run typecheck', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ Aucune erreur TypeScript');
} catch (e) {
  console.log('⚠️  Erreurs TypeScript détectées');
  console.log('   Lancer: npm run typecheck pour voir les détails');
  warnings++;
}

// 8. Vérifier eas.json
const easJsonPath = path.join(__dirname, '..', 'eas.json');
if (fs.existsSync(easJsonPath)) {
  console.log('✅ eas.json présent');
  try {
    const easJson = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
    const profiles = Object.keys(easJson.build);
    console.log(`   Profils: ${profiles.join(', ')}`);
  } catch (e) {
    console.log('⚠️  eas.json invalide:', e.message);
    warnings++;
  }
} else {
  console.log('⚠️  eas.json manquant');
  warnings++;
}

// Résumé
console.log('\n' + '='.repeat(60));
console.log('\n📊 RÉSUMÉ');
console.log('='.repeat(60));

if (errors === 0 && warnings === 0) {
  console.log('\n✅ Tout est prêt pour le build ! 🎉\n');
  console.log('Commandes suggérées:');
  console.log('  npm run build:preview   - Build de test');
  console.log('  npm run build:prod      - Build production APK');
  console.log('  npm run build:prod-aab  - Build Play Store AAB\n');
  process.exit(0);
} else {
  if (errors > 0) {
    console.log(`\n❌ ${errors} erreur(s) critique(s) détectée(s)`);
  }
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} avertissement(s)`);
  }
  
  console.log('\n🔧 Actions à effectuer:\n');
  
  if (errors > 0) {
    console.log('Erreurs critiques:');
    console.log('  1. Installer Node.js 16+ si nécessaire');
    console.log('  2. Lancer: npm install');
    console.log('  3. Générer les assets: npm run prepare-build');
    console.log('  4. Vérifier app.json\n');
  }
  
  if (warnings > 0) {
    console.log('Avertissements (non bloquants):');
    console.log('  - Installer EAS CLI: npm install -g eas-cli');
    console.log('  - Convertir les SVG en PNG: npm run convert-icons');
    console.log('  - Corriger les erreurs TypeScript: npm run typecheck\n');
  }
  
  process.exit(errors > 0 ? 1 : 0);
}
