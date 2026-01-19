```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║                    🛒 E-TSENA - APPLICATION DE GESTION                   ║
║                          DE LISTES DE COURSES                            ║
║                                                                          ║
║                            Version 1.0.3                                 ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

## ✨ Nouvelles Fonctionnalités

### 🎨 Design Premium
- **Logo professionnel redesigné** avec effets 3D et dégradés sophistiqués
- **Icônes élégantes** avec ombres portées dans toutes les cards
- **Interface moderne** optimisée pour Android

### 🚀 Système de Build Amélioré
- Génération automatique des assets (icônes, splash screen)
- Scripts de build simplifiés pour Windows et Linux/Mac
- Configuration optimisée pour APK et AAB (Play Store)

---

## 📋 Guide de Démarrage Rapide

### 1. Installation

```bash
cd d:\Projet_stage_L3\App_Etsena
npm install
```

### 2. Lancer en Mode Développement

```bash
npm start
```

Puis scannez le QR code avec l'app Expo Go

### 3. Builder l'Application

**Pour un aperçu rapide, consultez:**
- 📄 `START_HERE.txt` - Guide visuel simple
- 📘 `QUICK_BUILD_GUIDE.md` - Instructions rapides
- 📗 `BUILD_INSTRUCTIONS.md` - Guide complet avec dépannage

**Commandes principales:**

```bash
# 1. Générer les assets
npm run generate-icons

# 2. Convertir en PNG (avec sharp)
npm install --save-dev sharp
npm run convert-icons

# OU tout en une commande
npm run prepare-build

# 3. Builder
npm run build:preview    # Test
npm run build:prod       # Production APK
npm run build:prod-aab   # Play Store AAB
```

---

## 🎯 Structure du Projet

```
App_Etsena/
├── 📱 app/                    # Écrans de l'application
│   ├── (tabs)/               # Navigation par onglets
│   │   └── index.tsx         # Page d'accueil (MODIFIÉ ✨)
│   ├── achat/[id]/          # Détail d'une liste
│   ├── notifications/        # Gestion des notifications
│   └── rapports/            # Statistiques et rapports
│
├── 🎨 src/
│   ├── components/          
│   │   └── Logo.tsx         # Logo professionnel (MODIFIÉ ✨)
│   ├── context/             # Contextes React (thème, settings)
│   ├── db/                  # Base de données SQLite
│   ├── services/            # Services (notifications, voix)
│   └── utils/               # Utilitaires
│
├── 📦 assets/               # Ressources visuelles
│   ├── icon.png            # À générer
│   ├── adaptive-icon.png   # À générer
│   ├── splash.png          # À générer
│   └── notification-icon.png # À générer
│
├── 🔧 scripts/             # Scripts d'automatisation
│   ├── generate-app-icons.js   # Génère les SVG
│   ├── convert-svg-to-png.js   # Convertit en PNG
│   └── package.json           # Dépendances des scripts
│
├── 📝 Documentation
│   ├── START_HERE.txt         # ⭐ COMMENCEZ ICI
│   ├── QUICK_BUILD_GUIDE.md   # Guide rapide
│   ├── BUILD_INSTRUCTIONS.md  # Guide complet
│   └── CHANGELOG.md           # Historique des modifications
│
├── 🔨 Build Scripts
│   ├── build-app.bat         # Script Windows
│   └── build-app.sh          # Script Linux/Mac
│
└── ⚙️  Configuration
    ├── app.json              # Config Expo (MODIFIÉ ✨)
    ├── eas.json             # Config EAS Build (MODIFIÉ ✨)
    └── package.json         # Dépendances (MODIFIÉ ✨)
```

---

## 🎨 Modifications Visuelles

### Logo (src/components/Logo.tsx)
```typescript
// AVANT: Simple panier avec dégradé linéaire
// APRÈS: Design premium avec:
//   - Dégradé multi-stop sophistiqué
//   - Ombres internes pour profondeur 3D
//   - Reflets brillants
//   - Lignes décoratives verticales
//   - Point lumineux pour effet premium
```

### Icône Cards (app/(tabs)/index.tsx)
```typescript
// AVANT: 36×36px, sans ombre
// APRÈS: 40×40px avec:
//   - Ombre portée colorée (shadowColor: activeTheme.primary)
//   - Coins arrondis 12px
//   - Effet d'élévation (elevation: 5)
//   - Plus visible et attrayant
```

---

## 🛠️ Technologies Utilisées

- **React Native** - Framework mobile
- **Expo** ~54.0 - Outils de développement
- **TypeScript** - Typage statique
- **SQLite** - Base de données locale
- **Expo Router** - Navigation
- **React Native Voice** - Reconnaissance vocale
- **Linear Gradient** - Dégradés
- **Date-fns** - Manipulation de dates

---

## 📱 Fonctionnalités de l'App

### ✅ Gestion de Listes
- Création de listes de courses
- Ajout de produits avec quantités et prix
- Suggestions intelligentes basées sur l'historique
- Validation et archivage des listes

### 📊 Statistiques
- Rapports mensuels de dépenses
- Graphiques de tendances
- Analyse par catégories de produits
- Historique complet

### 🔔 Notifications
- Rappels programmables
- Notifications push
- Alertes de budget

### 🎨 Personnalisation
- Thèmes multiples (7 thèmes disponibles)
- Mode sombre/clair
- Couleurs personnalisables

### 🎤 Reconnaissance Vocale
- Saisie vocale des produits
- Saisie vocale des noms de listes
- Support français et malgache

---

## 🚀 Scripts NPM Disponibles

### Développement
```bash
npm start              # Démarrer Metro bundler
npm run android        # Lancer sur Android
npm run ios            # Lancer sur iOS
npm run typecheck      # Vérifier TypeScript
```

### Assets
```bash
npm run generate-icons # Générer les SVG
npm run convert-icons  # Convertir SVG → PNG (nécessite sharp)
npm run prepare-build  # Générer + Convertir (automatique)
```

### Build
```bash
npm run build:dev      # Build développement
npm run build:preview  # Build preview (test)
npm run build:prod     # Build production (APK)
npm run build:prod-aab # Build Play Store (AAB)
npm run build:local    # Build local (sans cloud)
```

---

## 📦 Build Android

### Prérequis
1. Compte Expo/EAS (gratuit)
2. Node.js 16+ installé
3. Internet pour le build cloud

### Étapes Rapides

**Option 1 - Script Automatique (Windows):**
```bash
build-app.bat preview android
```

**Option 2 - Commandes NPM:**
```bash
# 1. Générer les assets
npm run prepare-build

# 2. Installer EAS CLI
npm install -g eas-cli
eas login

# 3. Builder
npm run build:prod
```

**Option 3 - Commande Directe:**
```bash
eas build --platform android --profile production
```

### Télécharger le Build
```bash
eas build:download --latest --platform android
```

---

## 🔧 Configuration

### app.json
- Version: 1.0.3
- versionCode: 4
- Package: com.etsena.app
- Permissions: microphone, notifications, storage

### eas.json
Profils disponibles:
- `development` - Build de dev avec client Expo
- `preview` - Build APK pour tests
- `production` - Build APK optimisé
- `production-aab` - Build AAB pour Play Store

---

## 🐛 Dépannage

### Erreur "Module not found"
```bash
rm -rf node_modules
npm install
npx expo install --fix
```

### Erreur "Assets not found"
```bash
# Vérifier que les PNG existent
dir assets\*.png  # Windows
ls assets/*.png   # Linux/Mac

# Ou régénérer
npm run prepare-build
```

### Le build échoue
```bash
# Vérifier les erreurs TypeScript
npm run typecheck

# Nettoyer le cache
npx expo start --clear

# Voir les logs du build
eas build:view [BUILD_ID]
```

### Problème de conversion SVG
```bash
# Installer sharp
npm install --save-dev sharp

# Ou utiliser un convertisseur en ligne
# https://svgtopng.com
```

---

## 📚 Documentation Supplémentaire

- **Expo Docs**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **React Native**: https://reactnative.dev/docs/getting-started
- **Expo Router**: https://docs.expo.dev/router/introduction/

---

## 📄 Licence

Projet privé - E-tsena © 2026

---

## 👨‍💻 Développement

### Contribuer
1. Créer une branche: `git checkout -b feature/nouvelle-fonctionnalite`
2. Commiter: `git commit -m "Ajout de..."`
3. Pousser: `git push origin feature/nouvelle-fonctionnalite`

### Tests
```bash
# Tester en développement
npm start

# Vérifier le code
npm run typecheck
npm run lint
```

---

## 🎉 Prêt à Commencer ?

1. **Lisez** `START_HERE.txt` pour un guide visuel
2. **Installez** les dépendances: `npm install`
3. **Testez** l'app: `npm start`
4. **Générez** les assets: `npm run prepare-build`
5. **Buildez**: `npm run build:prod`

**Besoin d'aide ?** Consultez les fichiers de documentation:
- 📄 START_HERE.txt
- 📘 QUICK_BUILD_GUIDE.md
- 📗 BUILD_INSTRUCTIONS.md
- 📙 CHANGELOG.md

---

**Bonne chance avec E-tsena ! 🚀🛒**
