#!/bin/bash

# Script de build automatique pour E-tsena
# Usage: ./build-app.sh [production|preview|development]

set -e

BUILD_TYPE=${1:-preview}
PLATFORM=${2:-android}

echo "🚀 Démarrage du build E-tsena"
echo "📦 Type: $BUILD_TYPE"
echo "📱 Plateforme: $PLATFORM"
echo ""

# Vérification des prérequis
echo "🔍 Vérification des prérequis..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ Node.js: $(node --version)"
echo "✅ npm: $(npm --version)"
echo ""

# Installation des dépendances
echo "📥 Installation des dépendances..."
npm install
echo ""

# Vérification du code
echo "🔍 Vérification du code TypeScript..."
npm run typecheck || echo "⚠️  Avertissement: Erreurs TypeScript détectées"
echo ""

# Nettoyage du cache
echo "🧹 Nettoyage du cache..."
npx expo start --clear &
EXPO_PID=$!
sleep 3
kill $EXPO_PID 2>/dev/null || true
echo ""

# Génération des icônes (si nécessaire)
if [ ! -f "assets/icon.png" ]; then
    echo "🎨 Génération des icônes..."
    node scripts/generate-app-icons.js
    echo "⚠️  Attention: Convertir les fichiers SVG en PNG avant de continuer"
    echo ""
fi

# Build
echo "🏗️  Lancement du build..."
case $BUILD_TYPE in
    production)
        if [ "$PLATFORM" == "android" ]; then
            echo "📦 Build Android APK de production..."
            eas build --platform android --profile production
        elif [ "$PLATFORM" == "aab" ]; then
            echo "📦 Build Android AAB pour Play Store..."
            eas build --platform android --profile production-aab
        else
            echo "📦 Build multiplateforme..."
            eas build --platform all --profile production
        fi
        ;;
    preview)
        echo "📦 Build de prévisualisation..."
        eas build --platform $PLATFORM --profile preview
        ;;
    development)
        echo "📦 Build de développement..."
        eas build --platform $PLATFORM --profile development
        ;;
    *)
        echo "❌ Type de build invalide: $BUILD_TYPE"
        echo "Types valides: production, preview, development"
        exit 1
        ;;
esac

echo ""
echo "✅ Build terminé avec succès!"
echo "📱 Téléchargez votre build avec: eas build:download --latest --platform $PLATFORM"
