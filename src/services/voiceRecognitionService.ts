import Voice from '@react-native-voice/voice';
import { Platform } from 'react-native';

interface VoiceRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (text: string) => void;
  onError?: (error: any) => void;
  onEnd?: () => void;
}

class VoiceRecognitionService {
  private isListening = false;
  private callbacks: VoiceRecognitionCallbacks = {};

  constructor() {
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechError = this.onSpeechError;
    Voice.onSpeechEnd = this.onSpeechEnd;
  }

  private onSpeechStart = () => {
    console.log('🎤 Reconnaissance vocale démarrée');
    this.isListening = true;
    this.callbacks.onStart?.();
  };

  private onSpeechResults = (event: any) => {
    if (event.value && event.value.length > 0) {
      const recognizedText = event.value[0];
      console.log('🗣️ Texte reconnu:', recognizedText);
      this.callbacks.onResult?.(recognizedText);
    }
  };

  private onSpeechError = (error: any) => {
    console.error('❌ Erreur reconnaissance vocale:', error);
    this.isListening = false;
    this.callbacks.onError?.(error);
  };

  private onSpeechEnd = () => {
    console.log('🛑 Reconnaissance vocale terminée');
    this.isListening = false;
    this.callbacks.onEnd?.();
  };

  async startListening(callbacks: VoiceRecognitionCallbacks): Promise<boolean> {
    this.callbacks = callbacks;
    
    try {
      // Vérifier les permissions
      const available = await Voice.isAvailable();
      if (!available) {
        console.log('❌ Reconnaissance vocale non disponible');
        return false;
      }

      // Démarrer l'écoute
      await Voice.start(Platform.OS === 'ios' ? 'fr-FR' : 'fr-FR');
      return true;
    } catch (error) {
      console.error('Erreur démarrage reconnaissance:', error);
      this.callbacks.onError?.(error);
      return false;
    }
  }

  async stopListening(): Promise<void> {
    try {
      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Erreur arrêt reconnaissance:', error);
    }
  }

  async cancelListening(): Promise<void> {
    try {
      await Voice.cancel();
      this.isListening = false;
    } catch (error) {
      console.error('Erreur annulation reconnaissance:', error);
    }
  }

  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
      this.isListening = false;
      this.callbacks = {};
    } catch (error) {
      console.error('Erreur destruction:', error);
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

export default new VoiceRecognitionService();