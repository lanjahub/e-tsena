const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');

const assetsDir = path.join(__dirname, '..', 'assets');

const conversions = [
  { input: 'icon.svg', output: 'icon.png', size: 1024 },
  { input: 'splash.svg', output: 'splash.png', width: 1284, height: 2778 },
  { input: 'adaptive-icon.svg', output: 'adaptive-icon.png', size: 1024 },
  { input: 'notification-icon.svg', output: 'notification-icon.png', size: 96 }
];

async function convertSvgToPng() {
  console.log('\n🎨 Conversion des SVG en PNG...\n');
  
  for (const conversion of conversions) {
    const inputPath = path.join(assetsDir, conversion.input);
    const outputPath = path.join(assetsDir, conversion.output);
    
    try {
      if (!fs.existsSync(inputPath)) {
        console.log(`⚠️  ${conversion.input} non trouvé`);
        continue;
      }

      const sharpInstance = sharp(inputPath);
      
      if (conversion.size) {
        await sharpInstance
          .resize(conversion.size, conversion.size)
          .png()
          .toFile(outputPath);
      } else {
        await sharpInstance
          .resize(conversion.width, conversion.height)
          .png()
          .toFile(outputPath);
      }
      
      console.log(`✅ ${conversion.output} créé`);
    } catch (error) {
      console.error(`❌ Erreur pour ${conversion.input}:`, error.message);
    }
  }
  
  console.log('\n✨ Conversion terminée !\n');
}

convertSvgToPng().catch(console.error);
