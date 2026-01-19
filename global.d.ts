/// <reference types="expo-router" />

declare module '@expo/vector-icons' {
  export * from '@expo/vector-icons/build/Icons';
  import { ComponentType } from 'react';
  export const Ionicons: ComponentType<any>;
  export const MaterialIcons: ComponentType<any>;
  export const FontAwesome: ComponentType<any>;
  export const AntDesign: ComponentType<any>;
  export const Entypo: ComponentType<any>;
  export const Feather: ComponentType<any>;
  export const MaterialCommunityIcons: ComponentType<any>;
}

declare module 'expo-router' {
  export * from 'expo-router/build';
}

declare module 'expo-sqlite' {
  export * from 'expo-sqlite/build';
  export interface SQLiteDatabase {
    execSync(source: string): void;
    runSync(source: string, params?: any[]): any;
    getAllSync<T = any>(source: string, params?: any[]): T[];
    getFirstSync<T = any>(source: string, params?: any[]): T | null;
  }
  export function openDatabaseSync(name: string): SQLiteDatabase;
}

declare module '@react-native-community/datetimepicker' {
  import { ComponentType } from 'react';
  const DateTimePicker: ComponentType<any>;
  export default DateTimePicker;
}
