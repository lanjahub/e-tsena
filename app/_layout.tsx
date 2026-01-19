import { Stack, useRouter } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator, Text, AppState, AppStateStatus, Alert, Vibration } from 'react-native';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';

import { initDatabase, checkDatabase, getDb } from '../src/db/init';
import { ThemedStatusBar } from '../src/components/ThemedStatusBar';
import { useTheme, ThemeProvider } from '../src/context/ThemeContext';
import { SettingsProvider } from '../src/context/SettingsContext';
import { ToastProvider } from '../src/context/ToastContext'

import { 
  initNotificationTables,
  isRunningInExpoGo,
} from '../src/services/notificationService';

function NotificationChecker() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isChecking = useRef(false);

  const checkRappels = useCallback(() => {
    if (isChecking.current) return;
    isChecking.current = true;

    try {
      const db = getDb();
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const heureStr = now.toTimeString().slice(0, 5);

     
      const tableExists = db.getAllSync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Rappel'"
      );

      if (tableExists.length === 0) {
        isChecking.current = false;
        return;
      }

     
      const rappelsAafficher = db.getAllSync(`
        SELECT r.*, a.nomListe
        FROM Rappel r
        LEFT JOIN ListeAchat a ON r.idListeAchat = a.idListe
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

        
        Vibration.vibrate([0, 500, 200, 500]);

       
        Alert.alert(
          `🛒 ${rappel.titre || 'Rappel courses'}`,
          `${rappel.message}\n\n📍 ${rappel.nomListe || 'Liste de courses'}`,
          [
            {
              text: 'Plus tard',
              style: 'cancel',
              onPress: () => {
                
                db.runSync('UPDATE Rappel SET affiche = 1 WHERE idRappel = ?', [rappel.id]);
              },
            },
            {
              text: 'Voir la liste',
              onPress: () => {
                
                db.runSync('UPDATE Rappel SET affiche = 1, estLu = 1 WHERE idRappel = ?', [rappel.id]);
                if (rappel.idListeAchat) {
                  router.push(`/achat/${rappel.idListeAchat}`);
                }
              },
            },
          ],
          { cancelable: false }
        );

       
        db.runSync('UPDATE Rappel SET affiche = 1 WHERE idRappel = ?', [rappel.id]);
      }
    } catch (e) {
      console.error('Erreur vérification rappels:', e);
    } finally {
      isChecking.current = false;
    }
  }, [router]);

  useEffect(() => {
    
    const initialTimeout = setTimeout(() => {
      checkRappels();
    }, 2000);

  
    intervalRef.current = setInterval(checkRappels, 30000);

    
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
        console.log('🔧 [INIT] Début initialisation...');
        
        // 🔴 CORRECTION BUG "RIZ" - Décommentez les 3 lignes ci-dessous pour réinitialiser la base
        // console.log('🗑️ [DEBUG] Suppression de l\'ancienne base de données...');
        // await SQLite.deleteDatabaseAsync('etsena.db');
        // console.log('✅ [DEBUG] Base supprimée - Une nouvelle sera créée avec la migration corrigée');
        
        console.log('🔧 [INIT] Chargement des polices...');
        await Font.loadAsync({
          ...(Ionicons as any).font,
        });
        setFontsLoaded(true);
        console.log('✅ [INIT] Polices chargées');
        
        console.log('🔧 [INIT] Initialisation base de données...');
        initDatabase();
        console.log('✅ [INIT] DB initialisée');
        
        console.log('🔧 [INIT] Tables de notifications...');
        initNotificationTables();
        console.log('✅ [INIT] Notifications configurées');
        
        if (checkDatabase()) {
          setDbReady(true);
          console.log('✅ [INIT] DB prête');
        }

        
        if (isRunningInExpoGo()) {
          console.log('📱 Mode Expo Go - Rappels locaux actifs');
        } else {
          console.log('🚀 Mode Build - Notifications disponibles');
        }

        console.log('🎉 [INIT] Application prête !');

      } catch (e: any) {
        console.error('❌ [INIT] Erreur initialisation:', e);
        console.error('❌ [INIT] Stack:', e.stack);
        setError(e.message || 'Erreur inconnue');
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