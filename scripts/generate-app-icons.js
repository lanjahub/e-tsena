#!/usr/bin/env node

/**
 * Script de génération automatique des icônes et splash screen
 * Génère un design professionnel avec logo E-tsena
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const COLORS = {
  primary: '#7C3AED',
  secondary: '#A855F7',
  white: '#FFFFFF',
  background: '#F8FAFC'
};

// Fonction pour créer un SVG de logo professionnel
function createLogoSVG(size, includeBackground = false, isIcon = false) {
  const padding = isIcon ? size * 0.15 : size * 0.2;
  const logoSize = size - (padding * 2);
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Calcul des dimensions du panier
  const scale = logoSize / 100;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${COLORS.primary};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${COLORS.secondary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${COLORS.primary};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0" />
      <stop offset="50%" style="stop-color:white;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:white;stop-opacity:0" />
    </linearGradient>
    ${includeBackground ? `
    <radialGradient id="bgGrad" cx="50%" cy="50%">
      <stop offset="0%" style="stop-color:${COLORS.background};stop-opacity:1" />
      <stop offset="100%" style="stop-color:white;stop-opacity:1" />
    </radialGradient>
    ` : ''}
  </defs>
  
  ${includeBackground ? `
  <!-- Fond -->
  <rect width="${size}" height="${size}" fill="url(#bgGrad)"/>
  
  <!-- Cercle décoratif -->
  <circle cx="${centerX}" cy="${centerY}" r="${logoSize * 0.55}" fill="${COLORS.primary}" opacity="0.08"/>
  ` : isIcon ? `
  <!-- Fond adaptif Android -->
  <rect width="${size}" height="${size}" fill="${COLORS.primary}"/>
  ` : ''}
  
  <g transform="translate(${padding}, ${padding})">
    <!-- Anse du panier -->
    <path d="M ${30*scale} ${42*scale} Q ${30*scale} ${15*scale} ${50*scale} ${15*scale} Q ${70*scale} ${15*scale} ${70*scale} ${42*scale}"
          fill="none" stroke="url(#grad1)" stroke-width="${5*scale}" stroke-linecap="round"/>
    
    <!-- Corps du panier -->
    <path d="M ${22*scale} ${42*scale} L ${78*scale} ${42*scale} L ${75*scale} ${82*scale} Q ${74*scale} ${90*scale} ${66*scale} ${90*scale} L ${34*scale} ${90*scale} Q ${26*scale} ${90*scale} ${25*scale} ${82*scale} Z"
          fill="url(#grad1)"/>
    
    <!-- Ombre interne -->
    <path d="M ${25*scale} ${45*scale} L ${75*scale} ${45*scale} Q ${74*scale} ${48*scale} ${50*scale} ${46*scale} Q ${26*scale} ${48*scale} ${25*scale} ${45*scale}"
          fill="black" opacity="0.15"/>
    
    <!-- Reflet brillant -->
    <path d="M ${28*scale} ${48*scale} L ${72*scale} ${48*scale} L ${71*scale} ${52*scale} L ${29*scale} ${52*scale} Z"
          fill="url(#shine)" opacity="0.5"/>
    
    <!-- Lignes décoratives -->
    <line x1="${35*scale}" y1="${58*scale}" x2="${33*scale}" y2="${78*scale}" 
          stroke="white" stroke-width="${2*scale}" opacity="0.3" stroke-linecap="round"/>
    <line x1="${50*scale}" y1="${58*scale}" x2="${50*scale}" y2="${80*scale}" 
          stroke="white" stroke-width="${2.5*scale}" opacity="0.4" stroke-linecap="round"/>
    <line x1="${65*scale}" y1="${58*scale}" x2="${67*scale}" y2="${78*scale}" 
          stroke="white" stroke-width="${2*scale}" opacity="0.3" stroke-linecap="round"/>
    
    <!-- Point lumineux -->
    <circle cx="${58*scale}" cy="${25*scale}" r="${3*scale}" fill="white" opacity="0.6"/>
    <circle cx="${58*scale}" cy="${25*scale}" r="${1.5*scale}" fill="white" opacity="0.9"/>
  </g>
  
  ${includeBackground && !isIcon ? `
  <!-- Texte E-tsena -->
  <text x="${centerX}" y="${size - 60}" 
        font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
        fill="${COLORS.primary}" text-anchor="middle">E-tsena</text>
  <text x="${centerX}" y="${size - 25}" 
        font-family="Arial, sans-serif" font-size="20" font-weight="300" 
        fill="${COLORS.secondary}" text-anchor="middle">Gestion de courses</text>
  ` : ''}
</svg>`;
}

// Créer le répertoire assets s'il n'existe pas
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Générer les différentes versions
const files = [
  { name: 'icon.png', size: 1024, background: false, isIcon: false },
  { name: 'adaptive-icon.png', size: 1024, background: false, isIcon: true },
  { name: 'splash.png', size: 1284, background: true, isIcon: false },
  { name: 'notification-icon.png', size: 96, background: false, isIcon: true }
];

console.log('\n🎨 Génération des assets pour E-tsena...\n');

files.forEach(({ name, size, background, isIcon }) => {
  const svg = createLogoSVG(size, background, isIcon);
  const svgPath = path.join(ASSETS_DIR, name.replace('.png', '.svg'));
  
  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log(`✅ Créé: ${name.replace('.png', '.svg')} (${size}x${size})`);
});

console.log('\n📝 Instructions de conversion SVG → PNG:\n');
console.log('Option 1 - Utiliser un outil en ligne:');
console.log('  1. Allez sur https://svgtopng.com ou https://cloudconvert.com');
console.log('  2. Téléchargez chaque fichier SVG du dossier assets/');
console.log('  3. Téléchargez les PNG générés');
console.log('  4. Placez-les dans assets/ en remplaçant les SVG\n');

console.log('Option 2 - Utiliser ImageMagick (si installé):');
console.log('  cd assets');
console.log('  magick icon.svg icon.png');
console.log('  magick adaptive-icon.svg adaptive-icon.png');
console.log('  magick splash.svg splash.png');
console.log('  magick notification-icon.svg notification-icon.png\n');

console.log('Option 3 - Utiliser Inkscape (si installé):');
console.log('  inkscape icon.svg --export-filename=icon.png --export-width=1024');
console.log('  (répéter pour chaque fichier)\n');

console.log('✨ Fichiers SVG générés avec succès!\n');
