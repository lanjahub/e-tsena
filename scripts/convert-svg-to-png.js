#!/usr/bin/env node

/**
 * Script de conversion SVG vers PNG
 * Nécessite: npm install --save-dev sharp
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Liste des fichiers à convertir
const conversions = [
  { svg: 'icon.svg', png: 'icon.png', size: 1024 },
  { svg: 'adaptive-icon.svg', png: 'adaptive-icon.png', size: 1024 },
  { svg: 'splash.svg', png: 'splash.png', size: 1284 },
  { svg: 'notification-icon.svg', png: 'notification-icon.png', size: 96 }
];

console.log('\n📸 Conversion SVG → PNG avec Sharp\n');

// Vérifier si sharp est installé
try {
  require.resolve('sharp');
} catch (e) {
  console.log('❌ Sharp n\'est pas installé');
  console.log('\nInstallation:');
  console.log('  npm install --save-dev sharp\n');
  process.exit(1);
}

const sharp = require('sharp');

async function convertAll() {
  let successCount = 0;
  let errorCount = 0;

  for (const { svg, png, size } of conversions) {
    const svgPath = path.join(ASSETS_DIR, svg);
    const pngPath = path.join(ASSETS_DIR, png);

    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  Fichier non trouvé: ${svg}`);
      errorCount++;
      continue;
    }

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(pngPath);
      
      const stats = fs.statSync(pngPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`✅ ${png} (${size}x${size}) - ${sizeKB} KB`);
      successCount++;
    } catch (error) {
      console.log(`❌ Erreur lors de la conversion de ${svg}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Succès: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Erreurs: ${errorCount}`);
  }
  console.log('='.repeat(50) + '\n');

  if (successCount === conversions.length) {
    console.log('🎉 Tous les assets sont prêts pour le build!\n');
    
    // Nettoyer les fichiers SVG
    console.log('🧹 Voulez-vous supprimer les fichiers SVG? (y/n)');
    
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      if (answer === 'y' || answer === 'yes' || answer === 'o' || answer === 'oui') {
        conversions.forEach(({ svg }) => {
          const svgPath = path.join(ASSETS_DIR, svg);
          if (fs.existsSync(svgPath)) {
            fs.unlinkSync(svgPath);
            console.log(`🗑️  Supprimé: ${svg}`);
          }
        });
        console.log('\n✨ Nettoyage terminé!\n');
      } else {
        console.log('\n📁 Fichiers SVG conservés\n');
      }
      process.exit(0);
    });
  } else {
    process.exit(1);
  }
}

convertAll().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
