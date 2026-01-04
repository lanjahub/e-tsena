// src/context/ToastContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Retourner des fonctions vides si pas de contexte
    return {
      showToast: (message: string, type?: ToastType, duration?: number) => {
        console.log(`[Toast] ${type || 'info'}: ${message}`);
      },
      hideToast: () => {},
    };
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [fadeAnim, slideAnim]);

  const showToast = useCallback((msg: string, toastType: ToastType = 'info', duration: number = 3000) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMessage(msg);
    setType(toastType);
    setVisible(true);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      hideToast();
    }, duration);
  }, [fadeAnim, slideAnim, hideToast]);

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#10B981', icon: 'checkmark-circle' as const };
      case 'error':
        return { backgroundColor: '#EF4444', icon: 'close-circle' as const };
      case 'warning':
        return { backgroundColor: '#F59E0B', icon: 'warning' as const };
      case 'info':
      default:
        return { backgroundColor: '#3B82F6', icon: 'information-circle' as const };
    }
  };

  const toastStyle = getToastStyle();

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      
      {visible && (
        <Animated.View
          style={[
            styles.container,
            {
              top: insets.top + 10,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              backgroundColor: toastStyle.backgroundColor,
            },
          ]}
        >
          <TouchableOpacity 
            style={styles.content}
            onPress={hideToast}
            activeOpacity={0.8}
          >
            <Ionicons name={toastStyle.icon} size={24} color="#fff" />
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
            <TouchableOpacity onPress={hideToast} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: width - 32,
    borderRadius: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 4,
  },
});

export default ToastProvider;