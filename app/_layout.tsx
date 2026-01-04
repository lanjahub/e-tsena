// app/_layout.tsx
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator, Text, AppState, AppStateStatus, Alert, Vibration } from 'react-native';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

import { initDatabase, checkDatabase } from '../src/db/init';
import { ThemedStatusBar } from '../src/components/ThemedStatusBar';
import { useTheme, ThemeProvider } from '../src/context/ThemeContext';
import { SettingsProvider } from '../src/context/SettingsContext';
import { ToastProvider } from '../src/context/ToastContext';

// ⚠️ NE PAS importer NotificationChecker du fichier externe
// On le définit directement ici pour éviter les conflits

import { 
  initNotificationTables,
  isRunningInExpoGo,
} from '../src/services/notificationService';
import { getDb } from '../src/db/init';

// ============================================================
// 🔔 NOTIFICATION CHECKER (vérifie les rappels périodiquement)
// ============================================================

function NotificationChecker() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isChecking = useRef(false);

  // Vérifier les rappels en attente
  const checkRappels = useCallback(() => {
    if (isChecking.current) return;
    isChecking.current = true;

    try {
      const db = getDb();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const heureStr = now.toTimeString().slice(0, 5);

      // Vérifier s'il y a la table Rappel
      const tableExists = db.getAllSync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Rappel'"
      );

      if (tableExists.length === 0) {
        isChecking.current = false;
        return;
      }

      // Récupérer les rappels dont l'heure est passée et non encore affichés
      const rappelsAafficher = db.getAllSync(`
        SELECT r.*, a.nomListe
        FROM Rappel r
        LEFT JOIN Achat a ON r.achatId = a.id
        WHERE r.supprime = 0 
          AND r.affiche = 0
          AND (
            r.dateRappel < ? 
            OR (r.dateRappel = ? AND r.heureRappel <= ?)
          )
        ORDER BY r.dateRappel DESC, r.heureRappel DESC
        LIMIT 1
      `, [dateStr, dateStr, heureStr]) as any[];

      if (rappelsAafficher.length > 0) {
        const rappel = rappelsAafficher[0];

        // Vibrer pour attirer l'attention
        Vibration.vibrate([0, 500, 200, 500]);

        // Afficher l'alerte
        Alert.alert(
          `🛒 ${rappel.titre || 'Rappel courses'}`,
          `${rappel.message}\n\n📍 ${rappel.nomListe || 'Liste de courses'}`,
          [
            {
              text: 'Plus tard',
              style: 'cancel',
              onPress: () => {
                // Marquer comme affiché mais pas lu
                db.runSync('UPDATE Rappel SET affiche = 1 WHERE id = ?', [rappel.id]);
              },
            },
            {
              text: 'Voir la liste',
              onPress: () => {
                // Marquer comme lu
                db.runSync('UPDATE Rappel SET affiche = 1, lu = 1 WHERE id = ?', [rappel.id]);
                if (rappel.achatId) {
                  router.push(`/achat/${rappel.achatId}`);
                }
              },
            },
          ],
          { cancelable: false }
        );

        // Marquer comme affiché
        db.runSync('UPDATE Rappel SET affiche = 1 WHERE id = ?', [rappel.id]);
      }
    } catch (e) {
      // Silencieux - la table n'existe peut-être pas encore
    } finally {
      isChecking.current = false;
    }
  }, [router]);

  useEffect(() => {
    // Vérifier immédiatement au montage (avec délai pour laisser l'app se charger)
    const initialTimeout = setTimeout(() => {
      checkRappels();
    }, 2000);

    // Vérifier toutes les 30 secondes
    intervalRef.current = setInterval(checkRappels, 30000);

    // Écouter quand l'app revient au premier plan
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('📱 App active - Vérification des rappels');
        setTimeout(checkRappels, 500);
      }
      appState.current = nextAppState;
    });

    return () => {
      clearTimeout(initialTimeout);
      subscription.remove();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkRappels]);

  return null;
}

// ============================================================
// 🧭 NAVIGATION PRINCIPALE
// ============================================================

function RootLayoutNav() {
  const { activeTheme } = useTheme();
  const headerColor = activeTheme?.primary || '#7143b5';

  return (
    <>
      <ThemedStatusBar />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        <Stack.Screen 
          name="achat/[id]/index" 
          options={{ 
            headerShown: false, 
            title: 'Détails achat',
            headerStyle: { backgroundColor: headerColor },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
        
        <Stack.Screen name="analyse_produit" options={{ headerShown: false }} />
        <Stack.Screen name="rapports/index" options={{ headerShown: false }} />
        <Stack.Screen name="statistiques/index" options={{ headerShown: false }} />
        <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

// ============================================================
// 🎯 LAYOUT PRINCIPAL
// ============================================================

export default function Layout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // 1. Charger les fonts
        await Font.loadAsync({ ...Ionicons.font });
        setFontsLoaded(true);
        
        // 2. Initialiser la base de données principale
        initDatabase();
        
        // 3. Initialiser les tables de notifications/rappels
        initNotificationTables();
        
        // 4. Vérifier la DB
        if (checkDatabase()) {
          setDbReady(true);
        }

        // 5. Log du mode
        if (isRunningInExpoGo()) {
          console.log('📱 Mode Expo Go - Rappels locaux actifs');
        } else {
          console.log('🚀 Mode Build - Notifications disponibles');
        }

      } catch (e: any) {
        console.error('Erreur initialisation:', e);
        setError(e.message);
      }
    }
    
    prepare();
  }, []);

  // ============================================================
  // 🔴 ÉCRAN D'ERREUR
  // ============================================================
  if (error) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#FFF5F5',
        padding: 20 
      }}>
        <Ionicons name="warning" size={60} color="#EF4444" />
        <Text style={{ 
          marginTop: 20, 
          fontSize: 18, 
          fontWeight: 'bold', 
          color: '#DC2626',
          textAlign: 'center'
        }}>
          Erreur d'initialisation
        </Text>
        <Text style={{ 
          marginTop: 10, 
          fontSize: 14, 
          color: '#7F1D1D',
          textAlign: 'center'
        }}>
          {error}
        </Text>
      </View>
    );
  }

  // ============================================================
  // ⏳ ÉCRAN DE CHARGEMENT
  // ============================================================
  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#F8FAFC'
      }}>
        <ActivityIndicator size="large" color="#7143b5" />
        <Text style={{ 
          marginTop: 20, 
          color: '#64748B',
          fontSize: 14 
        }}>
          Chargement...
        </Text>
      </View>
    );
  }

  // ============================================================
  // ✅ APPLICATION PRÊTE
  // ============================================================
  return (
    <SettingsProvider>
      <ThemeProvider>
        <ToastProvider>
          {/* 🔔 Composant invisible qui vérifie les rappels */}
          <NotificationChecker />
          
          {/* 🧭 Navigation */}
          <RootLayoutNav />
        </ToastProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}