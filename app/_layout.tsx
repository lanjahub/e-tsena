import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { initDatabase, checkDatabase } from '@db/init';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator, Text, TouchableOpacity, Alert } from 'react-native';

export default function Layout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 Démarrage de l\'application E-tsena...');
        
        // Charger les fonts
        console.log('📝 Chargement des fonts...');
        await Font.loadAsync({
          ...Ionicons.font,
        });
        console.log('✅ Fonts chargées');
        setFontsLoaded(true);
        
        // Initialiser la DB
        console.log('📦 Initialisation de la base de données...');
        const dbInitialized = initDatabase();
        console.log('✅ DB initialisée:', dbInitialized);
        
        // Vérifier la DB
        console.log('🔍 Vérification de la base de données...');
        const dbChecked = checkDatabase();
        console.log('✅ DB vérifiée:', dbChecked);
        
        if (dbChecked) {
          setDbReady(true);
          console.log('🎉 Application prête!');
        } else {
          throw new Error('La vérification de la base de données a échoué');
        }
        
      } catch (e: any) {
        console.error('❌ ERREUR CRITIQUE:', e);
        setError(e.message || 'Erreur inconnue');
        Alert.alert(
          'Erreur d\'initialisation',
          `L'application ne peut pas démarrer: ${e.message}`,
          [
            {
              text: 'Réessayer',
              onPress: () => {
                setError(null);
                setFontsLoaded(false);
                setDbReady(false);
                prepare();
              }
            }
          ]
        );
      }
    }
    prepare();
  }, []);

  // Écran d'erreur
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Ionicons name="warning" size={64} color="#F44336" />
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16, color: '#333' }}>
          Erreur d'initialisation
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' }}>
          {error}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#7C4DFF',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 24
          }}
          onPress={() => {
            setError(null);
            setFontsLoaded(false);
            setDbReady(false);
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Écran de chargement
  if (!fontsLoaded || !dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F9FF' }}>
        <Ionicons name="basket" size={64} color="#60A5FA" />
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 16, color: '#60A5FA' }}>
          E-tsena
        </Text>
        <ActivityIndicator size="large" color="#60A5FA" style={{ marginTop: 24 }} />
        <Text style={{ fontSize: 14, color: '#999', marginTop: 12 }}>
          {!fontsLoaded ? 'Chargement des fonts...' : 'Initialisation de la base de données...'}
        </Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="achat/[id]/index" options={{ headerShown: true, title: 'Achat' }} />
    </Stack>
  );
}