import { Stack, useRouter } from 'expo-router';
import { useEffect, useState, useRef, useCallback } from 'react';
import { View, ActivityIndicator, Text, AppState, AppStateStatus, Alert, Vibration, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';

import { initDatabase, checkDatabase, getDb } from '../src/db/init';
import { ThemedStatusBar } from '../src/components/ThemedStatusBar';
import { useTheme, ThemeProvider } from '../src/context/ThemeContext';
import { SettingsProvider } from '../src/context/SettingsContext';
import { ToastProvider } from '../src/context/ToastContext';
import { useDatabasePersistence } from '../src/hooks/useDatabasePersistence';

import { 
  initNotificationTables,
  isRunningInExpoGo,
  initNotificationService,
} from '../src/services/notificationService';

// Import dynamique du module Notifications
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  console.log('⚠️ expo-notifications non disponible');
}

// ============================================================
// 🎨 SPLASHSCREEN AVEC ANIMATION
// ============================================================
function SplashScreen() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (dotAnim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dotAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createAnimation(dot1, 0),
      createAnimation(dot2, 200),
      createAnimation(dot3, 400),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={['#7C3AED', '#A855F7']}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      {/* Logo en cercle */}
      <View style={{
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
      }}>
        {/* Logo panier SVG - Même que sur la page d'accueil */}
        <Svg width="60" height="60" viewBox="0 0 24 24">
          <Path 
            d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zM17 18c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"
            fill="#7C3AED"
          />
        </Svg>
      </View>

      {/* Indicateurs de chargement (3 points) */}
      <View style={{ 
        flexDirection: 'row', 
        marginTop: 40,
        gap: 12,
      }}>
        {[dot1, dot2, dot3].map((dot, index) => (
          <Animated.View
            key={index}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: '#FFFFFF',
              opacity: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
              transform: [{
                scale: dot.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.2],
                }),
              }],
            }}
          />
        ))}
      </View>

      {/* Texte (optionnel) */}
      <Text style={{
        marginTop: 20,
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
        letterSpacing: 1,
      }}>
        Chargement...
      </Text>
    </LinearGradient>
  );
}

function NotificationChecker() {
  const router = useRouter();
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isChecking = useRef(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  const markRappelAsDisplayedByNotificationId = useCallback((notificationId?: string) => {
    if (!notificationId) return;
    try {
      const db = getDb();
      db.runSync('UPDATE Rappel SET affiche = 1, estLu = 1 WHERE notificationId = ?', [notificationId]);
    } catch (e) {
      console.warn('⚠️ Impossible de marquer le rappel (notificationId):', e);
    }
  }, []);
  
  // Vérifier la persistance de la base de données
  const { isVerified, wasDatabaseReset } = useDatabasePersistence();
  
  // Afficher un avertissement si la base a été réinitialisée
  useEffect(() => {
    if (isVerified && wasDatabaseReset) {
      Alert.alert(
        '⚠️ Données effacées',
        'Vos données ont été effacées car vous utilisez Expo Go en mode développement.\n\n' +
        'Pour conserver vos données entre les sessions, créez un build de développement avec:\n\n' +
        'npm run build:dev\n\n' +
        'Consultez SOLUTION_PERSISTANCE.md pour plus d\'informations.',
        [{ text: 'OK' }]
      );
    }
  }, [isVerified, wasDatabaseReset]);

  // Gérer les notifications push reçues
  useEffect(() => {
    if (!Notifications) return;

    // Initialiser les notifications
    initNotificationService();

    // Listener pour les notifications reçues quand l'app est ouverte
    notificationListener.current = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('🔔 Notification reçue:', notification);
      Vibration.vibrate([0, 250, 250, 250]);

      const notificationId = notification?.request?.identifier;
      markRappelAsDisplayedByNotificationId(notificationId);
      
      // Afficher une alerte
      const { title, body, data } = notification.request.content;
      Alert.alert(
        title || 'Rappel',
        body || '',
        [
          { text: 'OK', style: 'cancel' },
          data?.idListeAchat && {
            text: 'Voir la liste',
            onPress: () => router.push(`/achat/${data.idListeAchat}`)
          }
        ].filter(Boolean) as any
      );
    });

    // Listener pour quand l'utilisateur clique sur la notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('👆 Notification cliquée:', response);
      const data = response.notification.request.content.data;

      const notificationId = response?.notification?.request?.identifier;
      markRappelAsDisplayedByNotificationId(notificationId);
      
      // Naviguer vers la liste d'achat
      if (data?.idListeAchat) {
        console.log(`📱 Navigation vers liste ${data.idListeAchat}`);
        setTimeout(() => {
          router.push(`/achat/${data.idListeAchat}`);
        }, 500);
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [router]);

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
                
                db.runSync('UPDATE Rappel SET affiche = 1 WHERE idRappel = ?', [rappel.idRappel]);
              },
            },
            {
              text: 'Voir la liste',
              onPress: () => {
                
                db.runSync('UPDATE Rappel SET affiche = 1, estLu = 1 WHERE idRappel = ?', [rappel.idRappel]);
                if (rappel.idListeAchat) {
                  router.push(`/achat/${rappel.idListeAchat}`);
                }
              },
            },
          ],
          { cancelable: false }
        );

       
        db.runSync('UPDATE Rappel SET affiche = 1 WHERE idRappel = ?', [rappel.idRappel]);
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
  // ⏳ ÉCRAN DE CHARGEMENT (SPLASHSCREEN)
  // ============================================================
  if (!fontsLoaded || !dbReady) {
    return <SplashScreen />;
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