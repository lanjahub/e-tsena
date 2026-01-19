@echo off
REM Script de build automatique pour E-tsena (Windows)
REM Usage: build-app.bat [production|preview|development] [android|ios|all]

setlocal

set BUILD_TYPE=%1
if "%BUILD_TYPE%"=="" set BUILD_TYPE=preview

set PLATFORM=%2
if "%PLATFORM%"=="" set PLATFORM=android

echo.
echo ========================================
echo 🚀 Build E-tsena
echo ========================================
echo 📦 Type: %BUILD_TYPE%
echo 📱 Plateforme: %PLATFORM%
echo.

REM Vérification Node.js
echo 🔍 Vérification des prérequis...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js n'est pas installé
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm n'est pas installé
    pause
    exit /b 1
)

for /f "delims=" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "delims=" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js: %NODE_VERSION%
echo ✅ npm: %NPM_VERSION%
echo.

REM Installation des dépendances
echo 📥 Installation des dépendances...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Erreur lors de l'installation des dépendances
    pause
    exit /b 1
)
echo.

REM Vérification TypeScript
echo 🔍 Vérification du code TypeScript...
call npm run typecheck
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Avertissement: Erreurs TypeScript détectées
    echo Continuer quand même? (O/N)
    set /p CONTINUE=
    if /i not "%CONTINUE%"=="O" exit /b 1
)
echo.

REM Nettoyage du cache
echo 🧹 Nettoyage du cache Expo...
start /B npx expo start --clear
timeout /t 3 >nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *expo*" >nul 2>nul
echo.

REM Vérification des icônes
if not exist "assets\icon.png" (
    echo 🎨 Génération des icônes...
    call node scripts\generate-app-icons.js
    echo.
    echo ⚠️  ATTENTION: Les fichiers SVG ont été générés dans assets/
    echo    Vous devez les convertir en PNG avant de continuer:
    echo    1. Allez sur https://svgtopng.com
    echo    2. Téléchargez chaque fichier SVG
    echo    3. Téléchargez les PNG et remplacez les SVG
    echo.
    echo Appuyez sur une touche quand c'est fait...
    pause >nul
)

REM Build selon le type
echo.
echo 🏗️  Lancement du build...
echo.

if "%BUILD_TYPE%"=="production" (
    if "%PLATFORM%"=="aab" (
        echo 📦 Build Android AAB pour Play Store...
        call eas build --platform android --profile production-aab
    ) else if "%PLATFORM%"=="android" (
        echo 📦 Build Android APK de production...
        call eas build --platform android --profile production
    ) else (
        echo 📦 Build multiplateforme...
        call eas build --platform all --profile production
    )
) else if "%BUILD_TYPE%"=="preview" (
    echo 📦 Build de prévisualisation (%PLATFORM%)...
    call eas build --platform %PLATFORM% --profile preview
) else if "%BUILD_TYPE%"=="development" (
    echo 📦 Build de développement (%PLATFORM%)...
    call eas build --platform %PLATFORM% --profile development
) else (
    echo ❌ Type de build invalide: %BUILD_TYPE%
    echo Types valides: production, preview, development
    pause
    exit /b 1
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Le build a échoué
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✅ Build terminé avec succès!
echo ========================================
echo.
echo 📱 Pour télécharger votre build:
echo    eas build:download --latest --platform %PLATFORM%
echo.
echo 🌐 Ou accédez au dashboard:
echo    https://expo.dev/accounts/[votre-compte]/projects/e-tsena/builds
echo.
pause
