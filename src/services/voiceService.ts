import { Platform, Alert, PermissionsAndroid } from 'react-native';

// Types pour la reconnaissance vocale
export interface VoiceResult {
  value: string[];
  error?: string;
}

export interface VoiceState {
  isListening: boolean;
  results: string[];
  partialResults: string[];
  error: string | null;
}

// Variable pour stocker le module Voice
let Voice: any = null;

// Charger le module de façon sécurisée
function getVoiceModule() {
  if (Voice === null) {
    try {
      Voice = require('@react-native-voice/voice').default;
    } catch (e) {
      console.warn('⚠️ @react-native-voice/voice non disponible:', e);
      Voice = undefined;
    }
  }
  return Voice;
}

// ============================================================
// 🎤 VÉRIFIER LA DISPONIBILITÉ
// ============================================================

export function isVoiceAvailable(): boolean {
  const VoiceModule = getVoiceModule();
  return VoiceModule !== undefined && VoiceModule !== null;
}

// ============================================================
// 🔒 DEMANDER LES PERMISSIONS
// ============================================================

export async function requestVoicePermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Permission Microphone',
          message: 'L\'application a besoin d\'accéder au microphone pour la reconnaissance vocale.',
          buttonNeutral: 'Plus tard',
          buttonNegative: 'Refuser',
          buttonPositive: 'Autoriser',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    
    // iOS gère les permissions automatiquement
    return true;
  } catch (error) {
    console.error('❌ Erreur permission voice:', error);
    return false;
  }
}

// ============================================================
// 🎤 CLASSE SERVICE VOICE
// ============================================================

export class VoiceRecognitionService {
  private isInitialized: boolean = false;
  private currentLocale: string = 'fr-FR';
  
  // Callbacks
  onSpeechStart: (() => void) | null = null;
  onSpeechEnd: (() => void) | null = null;
  onSpeechResults: ((results: string[]) => void) | null = null;
  onSpeechPartialResults: ((results: string[]) => void) | null = null;
  onSpeechError: ((error: string) => void) | null = null;
  onSpeechVolumeChanged: ((volume: number) => void) | null = null;

  constructor(locale: string = 'fr-FR') {
    this.currentLocale = locale;
  }

  // Initialiser le service
  async initialize(): Promise<boolean> {
    const VoiceModule = getVoiceModule();
    
    if (!VoiceModule) {
      console.log('❌ Module Voice non disponible');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    try {
      // Demander les permissions
      const hasPermission = await requestVoicePermissions();
      if (!hasPermission) {
        console.log('❌ Permission microphone refusée');
        return false;
      }

      // Configurer les listeners
      VoiceModule.onSpeechStart = this.handleSpeechStart;
      VoiceModule.onSpeechEnd = this.handleSpeechEnd;
      VoiceModule.onSpeechResults = this.handleSpeechResults;
      VoiceModule.onSpeechPartialResults = this.handleSpeechPartialResults;
      VoiceModule.onSpeechError = this.handleSpeechError;
      VoiceModule.onSpeechVolumeChanged = this.handleSpeechVolumeChanged;

      this.isInitialized = true;
      console.log('✅ Service Voice initialisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation Voice:', error);
      return false;
    }
  }

  // Handlers internes
  private handleSpeechStart = () => {
    console.log('🎤 Écoute démarrée');
    this.onSpeechStart?.();
  };

  private handleSpeechEnd = () => {
    console.log('🎤 Écoute terminée');
    this.onSpeechEnd?.();
  };

  private handleSpeechResults = (e: any) => {
    console.log('✅ Résultats:', e.value);
    this.onSpeechResults?.(e.value || []);
  };

  private handleSpeechPartialResults = (e: any) => {
    console.log('📝 Résultats partiels:', e.value);
    this.onSpeechPartialResults?.(e.value || []);
  };

  private handleSpeechError = (e: any) => {
    console.error('❌ Erreur Speech:', e.error);
    this.onSpeechError?.(e.error?.message || 'Erreur de reconnaissance');
  };

  private handleSpeechVolumeChanged = (e: any) => {
    this.onSpeechVolumeChanged?.(e.value);
  };

  // Démarrer l'écoute
  async startListening(): Promise<boolean> {
    const VoiceModule = getVoiceModule();
    
    if (!VoiceModule) {
      Alert.alert(
        'Non disponible',
        'La reconnaissance vocale nécessite un build natif de l\'application.'
      );
      return false;
    }

    try {
      // S'assurer que l'initialisation est faite
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      // Arrêter toute écoute en cours
      await this.stopListening();

      // Démarrer l'écoute
      await VoiceModule.start(this.currentLocale);
      console.log('🎤 Écoute démarrée avec locale:', this.currentLocale);
      return true;
    } catch (error: any) {
      console.error('❌ Erreur démarrage écoute:', error);
      this.onSpeechError?.(error.message || 'Impossible de démarrer l\'écoute');
      return false;
    }
  }

  // Arrêter l'écoute
  async stopListening(): Promise<void> {
    const VoiceModule = getVoiceModule();
    if (!VoiceModule) return;

    try {
      await VoiceModule.stop();
      console.log('🛑 Écoute arrêtée');
    } catch (error) {
      console.error('❌ Erreur arrêt écoute:', error);
    }
  }

  // Annuler l'écoute
  async cancelListening(): Promise<void> {
    const VoiceModule = getVoiceModule();
    if (!VoiceModule) return;

    try {
      await VoiceModule.cancel();
      console.log('❌ Écoute annulée');
    } catch (error) {
      console.error('❌ Erreur annulation:', error);
    }
  }

  // Vérifier si disponible
  async isRecognitionAvailable(): Promise<boolean> {
    const VoiceModule = getVoiceModule();
    if (!VoiceModule) return false;

    try {
      return await VoiceModule.isAvailable();
    } catch {
      return false;
    }
  }

  // Changer la locale
  setLocale(locale: string) {
    this.currentLocale = locale;
  }

  // Nettoyer
  async destroy(): Promise<void> {
    const VoiceModule = getVoiceModule();
    if (!VoiceModule) return;

    try {
      await VoiceModule.destroy();
      this.isInitialized = false;
      
      // Nettoyer les listeners
      VoiceModule.onSpeechStart = undefined;
      VoiceModule.onSpeechEnd = undefined;
      VoiceModule.onSpeechResults = undefined;
      VoiceModule.onSpeechPartialResults = undefined;
      VoiceModule.onSpeechError = undefined;
      VoiceModule.onSpeechVolumeChanged = undefined;
      
      console.log('🗑️ Service Voice détruit');
    } catch (error) {
      console.error('❌ Erreur destruction:', error);
    }
  }
}

// ============================================================
// 🎯 HOOK REACT POUR LA VOIX
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';

export function useVoiceRecognition(locale: string = 'fr-FR') {
  const [isListening, setIsListening] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [partialResults, setPartialResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [volume, setVolume] = useState(0);
  
  const serviceRef = useRef<VoiceRecognitionService | null>(null);

  useEffect(() => {
    const service = new VoiceRecognitionService(locale);
    serviceRef.current = service;

    // Configurer les callbacks
    service.onSpeechStart = () => {
      setIsListening(true);
      setError(null);
      setResults([]);
      setPartialResults([]);
    };

    service.onSpeechEnd = () => {
      setIsListening(false);
    };

    service.onSpeechResults = (res) => {
      setResults(res);
      setIsListening(false);
    };

    service.onSpeechPartialResults = (res) => {
      setPartialResults(res);
    };

    service.onSpeechError = (err) => {
      setError(err);
      setIsListening(false);
    };

    service.onSpeechVolumeChanged = (vol) => {
      setVolume(vol);
    };

    // Vérifier la disponibilité
    service.isRecognitionAvailable().then(setIsAvailable);

    return () => {
      service.destroy();
    };
  }, [locale]);

  const startListening = useCallback(async () => {
    if (serviceRef.current) {
      const started = await serviceRef.current.startListening();
      return started;
    }
    return false;
  }, []);

  const stopListening = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.stopListening();
    }
  }, []);

  const cancelListening = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.cancelListening();
    }
  }, []);

  return {
    isListening,
    isAvailable,
    results,
    partialResults,
    error,
    volume,
    startListening,
    stopListening,
    cancelListening,
  };
}

// ============================================================
// 🔧 UTILITAIRES
// ============================================================

// Parser les résultats vocaux pour extraire des produits
export function parseVoiceResultForProducts(text: string): { nom: string; quantite?: number; unite?: string }[] {
  const products: { nom: string; quantite?: number; unite?: string }[] = [];
  
  // Nettoyer le texte
  const cleanText = text.toLowerCase().trim();
  
  // Patterns pour détecter les quantités
  const quantityPatterns = [
    /(\d+)\s*(kg|kilo|kilos)\s+(?:de\s+)?(.+)/i,
    /(\d+)\s*(g|grammes?)\s+(?:de\s+)?(.+)/i,
    /(\d+)\s*(l|litre|litres)\s+(?:de\s+)?(.+)/i,
    /(\d+)\s*(pcs?|pièces?|unités?)\s+(?:de\s+)?(.+)/i,
    /(\d+)\s+(.+)/i,
  ];
  
  // Séparer par "et", "virgule", etc.
  const separators = /\s+et\s+|,\s*|;\s*/;
  const parts = cleanText.split(separators);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    let matched = false;
    
    for (const pattern of quantityPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const qty = parseInt(match[1], 10);
        let unite = match[2] || 'pcs';
        let nom = match[3] || match[2];
        
        // Normaliser les unités
        if (/kilo/i.test(unite)) unite = 'kg';
        if (/litre/i.test(unite)) unite = 'L';
        if (/gramme/i.test(unite)) unite = 'g';
        if (/pièce|unité/i.test(unite)) unite = 'pcs';
        
        products.push({
          nom: nom.charAt(0).toUpperCase() + nom.slice(1),
          quantite: qty,
          unite,
        });
        matched = true;
        break;
      }
    }
    
    if (!matched && trimmed.length > 1) {
      products.push({
        nom: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
      });
    }
  }
  
  return products;
}

// ============================================================
// 🎯 API SIMPLIFIÉE POUR COMPATIBILITÉ
// ============================================================

// Instance singleton pour une utilisation simple
let globalServiceInstance: VoiceRecognitionService | null = null;
const resultListeners: Array<(results: string[]) => void> = [];

export function addResultListener(callback: (results: string[]) => void): void {
  resultListeners.push(callback);
}

export function removeResultListener(callback: (results: string[]) => void): void {
  const index = resultListeners.indexOf(callback);
  if (index > -1) {
    resultListeners.splice(index, 1);
  }
}

export async function startListening(): Promise<boolean> {
  if (!globalServiceInstance) {
    globalServiceInstance = new VoiceRecognitionService('fr-FR');
    
    // Configurer les callbacks
    globalServiceInstance.onSpeechResults = (results) => {
      resultListeners.forEach(listener => listener(results));
    };
    
    await globalServiceInstance.initialize();
  }
  
  return await globalServiceInstance.startListening();
}

export async function stopListening(): Promise<void> {
  if (globalServiceInstance) {
    await globalServiceInstance.stopListening();
  }
}

export async function cancelListening(): Promise<void> {
  if (globalServiceInstance) {
    await globalServiceInstance.cancelListening();
  }
}

export async function destroyVoiceService(): Promise<void> {
  if (globalServiceInstance) {
    await globalServiceInstance.destroy();
    globalServiceInstance = null;
    resultListeners.length = 0;
  }
}

export default VoiceRecognitionService;