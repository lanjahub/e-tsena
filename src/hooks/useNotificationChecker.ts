// src/hooks/useNotificationChecker.ts
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import {
  checkPendingNotifications,
  showLocalNotification,
  isRunningInExpoGo,
  PendingNotification,
} from '../services/notificationService';

interface UseNotificationCheckerOptions {
  enabled?: boolean;
  intervalMs?: number;
  onNotification?: (notification: PendingNotification) => void;
}

export function useNotificationChecker(options: UseNotificationCheckerOptions = {}) {
  const { 
    enabled = true, 
    intervalMs = 5000, // Vérifier toutes les 5 secondes
    onNotification 
  } = options;
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const checkNotifications = useCallback(() => {
    // Seulement dans Expo Go
    if (!isRunningInExpoGo()) return;

    const pending = checkPendingNotifications();
    
    pending.forEach(notif => {
      showLocalNotification(notif, () => {
        // Navigation quand l'utilisateur clique "Voir"
        if (notif.achatId) {
          router.push(`/achat/${notif.achatId}`);
        } else {
          router.push('/notifications');
        }
      });
      
      onNotification?.(notif);
    });
  }, [onNotification]);

  useEffect(() => {
    if (!enabled || !isRunningInExpoGo()) return;

    // Vérifier immédiatement
    checkNotifications();

    // Puis toutes les X secondes
    intervalRef.current = setInterval(checkNotifications, intervalMs);

    // Gérer le retour au premier plan
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        checkNotifications();
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      subscription.remove();
    };
  }, [enabled, intervalMs, checkNotifications]);

  return { checkNotifications };
}