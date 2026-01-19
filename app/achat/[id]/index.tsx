// app/achat/[id]/index.tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Animated, Vibration,
  Dimensions, Share
} from 'react-native';
import { ThemedStatusBar } from '../../../src/components/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useNavigation, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

import { getDb } from '../../../src/db/init'; 
import { useTheme } from '../../../src/context/ThemeContext'; 
import { useSettings } from '../../../src/context/SettingsContext';
import { registerForPushNotificationsAsync } from '../../../src/services/notificationService';
import { ConfirmModal } from '../../../src/components/ConfirmModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Achat {
  idListe: number;
  nomListe: string;
  dateAchat: string;
}

interface SuggestedProduct {
  nom: string;
  lastPrice: number;
  count: number;
  unite: string;
  source: 'history' | 'popular';
}

interface ModalData {
  type: 'add' | 'edit';
  itemId: number;
  nom: string;
  qty: string;
  prix: string;
  unite: string;
  suggestedPrice: number;
}

// =============================================
// PRODUITS MALGACHES COURANTS
// =============================================
const MALAGASY_POPULAR_PRODUCTS: { nom: string; unite: string; category: string; keywords: string[] }[] = [
  // VARY SY MENAKA (Riz et huile)
  { nom: 'Vary fotsy', unite: 'kg', category: 'base', keywords: ['riz', 'vary', 'ri', 'fotsy'] },
  { nom: 'Vary gasy', unite: 'kapoaka', category: 'base', keywords: ['riz', 'vary', 'gasy'] },
  { nom: 'Vary makalioka', unite: 'kg', category: 'base', keywords: ['vary', 'makalioka'] },
  { nom: 'Menaka', unite: 'L', category: 'base', keywords: ['huile', 'menaka', 'hui'] },
  { nom: 'Menaka voanio', unite: 'L', category: 'base', keywords: ['coco', 'huile', 'voanio'] },
  
  // HENA (Viande)
  { nom: 'Hena omby', unite: 'kg', category: 'viande', keywords: ['boeuf', 'viande', 'hena', 'omby', 'boe'] },
  { nom: 'Hena kisoa', unite: 'kg', category: 'viande', keywords: ['porc', 'kisoa', 'por', 'hena'] },
  { nom: 'Akoho', unite: 'pcs', category: 'viande', keywords: ['poulet', 'akoho', 'poul'] },
  { nom: 'Akoho gasy', unite: 'pcs', category: 'viande', keywords: ['poulet', 'akoho', 'gasy'] },
  { nom: 'Hena voay', unite: 'kg', category: 'viande', keywords: ['zebu', 'zébu', 'voay'] },
  { nom: 'Saosizy', unite: 'pcs', category: 'viande', keywords: ['saucisse', 'sosis', 'saosizy'] },
  { nom: 'Hena-kisoa voatoto', unite: 'kg', category: 'viande', keywords: ['haché', 'hache', 'voatoto'] },
  
  // TRONDRO (Poisson)
  { nom: 'Trondro vaovao', unite: 'kg', category: 'poisson', keywords: ['poisson', 'trondro', 'pois', 'vaovao'] },
  { nom: 'Tilapia', unite: 'kg', category: 'poisson', keywords: ['tilapia'] },
  { nom: 'Makamba', unite: 'kg', category: 'poisson', keywords: ['crevette', 'makamba', 'crev'] },
  { nom: 'Trondro maina', unite: 'kg', category: 'poisson', keywords: ['séché', 'seche', 'maina'] },
  { nom: 'Foza', unite: 'kg', category: 'poisson', keywords: ['crabe', 'foza'] },
  { nom: 'Drakaka', unite: 'kg', category: 'poisson', keywords: ['crabe', 'drakaka'] },
  { nom: 'Orita', unite: 'kg', category: 'poisson', keywords: ['orita', 'anguille'] },
  
  // LEGIOMA (Légumes)
  { nom: 'Voatabia', unite: 'kg', category: 'legume', keywords: ['tomate', 'voatabia', 'tom'] },
  { nom: 'Tongolo', unite: 'kg', category: 'legume', keywords: ['oignon', 'tongolo', 'oig'] },
  { nom: 'Tongolo gasy', unite: 'loha', category: 'legume', keywords: ['ail', 'tongolo gasy'] },
  { nom: 'Sakamalao', unite: 'g', category: 'legume', keywords: ['gingembre', 'sakamalao'] },
  { nom: 'Karaoty', unite: 'kg', category: 'legume', keywords: ['carotte', 'karaoty', 'car'] },
  { nom: 'Tsaramaso maintso', unite: 'kg', category: 'legume', keywords: ['haricot', 'tsaramaso', 'maintso'] },
  { nom: 'Anana', unite: 'fehiny', category: 'legume', keywords: ['brède', 'brede', 'anana'] },
  { nom: 'Anamalaho', unite: 'fehiny', category: 'legume', keywords: ['brède', 'anamalaho'] },
  { nom: 'Anamafana', unite: 'fehiny', category: 'legume', keywords: ['mafana', 'brède', 'anamafana'] },
  { nom: 'Anamamy', unite: 'fehiny', category: 'legume', keywords: ['morelle', 'anamamy'] },
  { nom: 'Ovy', unite: 'kg', category: 'legume', keywords: ['pomme', 'terre', 'ovy', 'patate', 'pom'] },
  { nom: 'Mangahazo', unite: 'kg', category: 'legume', keywords: ['manioc', 'mangahazo', 'man'] },
  { nom: 'Vomanga', unite: 'kg', category: 'legume', keywords: ['patate', 'douce', 'vomanga'] },
  { nom: 'Salady', unite: 'pcs', category: 'legume', keywords: ['salade', 'laitue', 'sal', 'salady'] },
  { nom: 'Laisoa', unite: 'pcs', category: 'legume', keywords: ['chou', 'laisoa'] },
  { nom: 'Voatavo', unite: 'kg', category: 'legume', keywords: ['citrouille', 'voatavo', 'courge'] },
  { nom: 'Sakay', unite: 'g', category: 'legume', keywords: ['piment', 'sakay', 'pim'] },
  { nom: 'Poivron', unite: 'pcs', category: 'legume', keywords: ['poivron', 'poiv'] },
  { nom: 'Concombre', unite: 'pcs', category: 'legume', keywords: ['concombre', 'conc'] },
  { nom: 'Courgette', unite: 'kg', category: 'legume', keywords: ['courgette', 'cour'] },
  
  // VOANKAZO (Fruits)
  { nom: 'Akondro', unite: 'takelaka', category: 'fruit', keywords: ['banane', 'akondro', 'ban'] },
  { nom: 'Manga', unite: 'kg', category: 'fruit', keywords: ['mangue', 'manga', 'mang'] },
  { nom: 'Voasary', unite: 'kg', category: 'fruit', keywords: ['orange', 'voasary', 'ora'] },
  { nom: 'Mananasy', unite: 'pcs', category: 'fruit', keywords: ['ananas', 'mananasy'] },
  { nom: 'Papay', unite: 'pcs', category: 'fruit', keywords: ['papaye', 'papay'] },
  { nom: 'Letchi', unite: 'kg', category: 'fruit', keywords: ['litchi', 'letchi'] },
  { nom: 'Paoma', unite: 'kg', category: 'fruit', keywords: ['pomme', 'pom', 'paoma'] },
  { nom: 'Voasary makirana', unite: 'kg', category: 'fruit', keywords: ['citron', 'voasary makirana'] },
  { nom: 'Zavoka', unite: 'pcs', category: 'fruit', keywords: ['avocat', 'zavoka', 'avo'] },
  { nom: 'Voahangy', unite: 'kg', category: 'fruit', keywords: ['raisin', 'voahangy'] },
  
  // RONONO SY ATODY (Produits laitiers et œufs)
  { nom: 'Atody', unite: 'pcs', category: 'laitier', keywords: ['oeuf', 'œuf', 'atody', 'oeu'] },
  { nom: 'Atody akoho', unite: 'pcs', category: 'laitier', keywords: ['oeuf', 'atody', 'akoho'] },
  { nom: 'Ronono', unite: 'L', category: 'laitier', keywords: ['lait', 'ronono', 'lai'] },
  { nom: 'Yaorta', unite: 'pots', category: 'laitier', keywords: ['yaourt', 'yao', 'yaorta'] },
  { nom: 'Fromazy', unite: 'g', category: 'laitier', keywords: ['fromage', 'from', 'fromazy'] },
  { nom: 'Dibera', unite: 'g', category: 'laitier', keywords: ['beurre', 'beur', 'dibera'] },
  
  // TSARAMASO SY VOANEMBA (Légumineuses)
  { nom: 'Tsaramaso maina', unite: 'kg', category: 'legumineuse', keywords: ['haricot', 'tsaramaso', 'sec', 'maina'] },
  { nom: 'Lentilles', unite: 'kg', category: 'legumineuse', keywords: ['lentille', 'lent'] },
  { nom: 'Kabaro', unite: 'kg', category: 'legumineuse', keywords: ['pois', 'cap', 'kabaro'] },
  { nom: 'Voanjobory', unite: 'kg', category: 'legumineuse', keywords: ['voanjobory', 'bambara'] },
  { nom: 'Voanjo', unite: 'kg', category: 'legumineuse', keywords: ['arachide', 'pistache', 'voanjo'] },
  
  // LAOKA MALAGASY
  { nom: 'Ravitoto', unite: 'fehiny', category: 'laoka', keywords: ['ravitoto', 'ravi'] },
  { nom: 'Ravin-mangahazo', unite: 'fehiny', category: 'laoka', keywords: ['manioc', 'feuille', 'ravin'] },
  { nom: 'Sauce tomate', unite: 'boîte', category: 'laoka', keywords: ['sauce', 'tomate'] },
  { nom: 'Lasary', unite: 'pot', category: 'laoka', keywords: ['lasary', 'achards'] },
  { nom: 'Achards', unite: 'pot', category: 'laoka', keywords: ['achards', 'achard'] },
  { nom: 'Rougail', unite: 'pot', category: 'laoka', keywords: ['rougail', 'rougay'] },
  { nom: 'Kitoza', unite: 'kg', category: 'laoka', keywords: ['kitoza', 'viande', 'fumée'] },
  
  // MOFO (Pain et pâtisserie)
  { nom: 'Mofo', unite: 'pcs', category: 'boulangerie', keywords: ['pain', 'mofo', 'pai'] },
  { nom: 'Mofo gasy', unite: 'pcs', category: 'boulangerie', keywords: ['mofo', 'gasy'] },
  { nom: 'Mofo baolina', unite: 'pcs', category: 'boulangerie', keywords: ['baolina', 'beignet'] },
  { nom: 'Mofo menakely', unite: 'pcs', category: 'boulangerie', keywords: ['menakely', 'beignet'] },
  { nom: 'Mofo akondro', unite: 'pcs', category: 'boulangerie', keywords: ['akondro', 'banane'] },
  { nom: 'Koba', unite: 'pcs', category: 'boulangerie', keywords: ['koba', 'ravina'] },
  { nom: 'Koba ravina', unite: 'pcs', category: 'boulangerie', keywords: ['koba', 'ravina'] },
  { nom: 'Lafarina', unite: 'kg', category: 'boulangerie', keywords: ['farine', 'far', 'lafarina'] },
  { nom: 'Ramanonaka', unite: 'pcs', category: 'boulangerie', keywords: ['ramanonaka', 'galette'] },
  
  // SIRAMAMY SY SIRA
  { nom: 'Siramamy', unite: 'kg', category: 'epicerie', keywords: ['sucre', 'siramamy', 'suc'] },
  { nom: 'Sira', unite: 'kg', category: 'epicerie', keywords: ['sel', 'sira'] },
  { nom: 'Kafe', unite: 'g', category: 'epicerie', keywords: ['café', 'cafe', 'kafe', 'caf'] },
  { nom: 'Dite', unite: 'boîte', category: 'epicerie', keywords: ['thé', 'the', 'ravin', 'dite'] },
  { nom: 'Lavanila', unite: 'gousse', category: 'epicerie', keywords: ['vanille', 'lavanila'] },
  { nom: 'Kanely', unite: 'g', category: 'epicerie', keywords: ['cannelle', 'cann', 'kanely'] },
  { nom: 'Jirofo', unite: 'g', category: 'epicerie', keywords: ['girofle', 'jirofo'] },
  
  // ZAVA-PISOTRO (Boissons)
  { nom: 'Rano', unite: 'L', category: 'boisson', keywords: ['eau', 'rano', 'minérale'] },
  { nom: 'Rano mineraly', unite: 'L', category: 'boisson', keywords: ['eau', 'rano', 'mineraly'] },
  { nom: 'Ranom-boankazo', unite: 'L', category: 'boisson', keywords: ['jus', 'fruit', 'ranom'] },
  { nom: 'Soda', unite: 'L', category: 'boisson', keywords: ['soda', 'coca', 'sprite'] },
  { nom: 'Bonbon anglais', unite: 'L', category: 'boisson', keywords: ['bonbon', 'anglais'] },
  { nom: 'THB', unite: 'bouteille', category: 'boisson', keywords: ['thb', 'bière', 'biere'] },
  { nom: 'Toaka gasy', unite: 'bouteille', category: 'boisson', keywords: ['rhum', 'toaka', 'gasy'] },
  { nom: 'Litchel', unite: 'bouteille', category: 'boisson', keywords: ['litchel', 'litchi'] },
  
  // SAKAFO (Épicerie)
  { nom: 'Paty', unite: 'paquet', category: 'epicerie', keywords: ['pâte', 'pate', 'spaghetti', 'paty'] },
  { nom: 'Sardina', unite: 'boîte', category: 'epicerie', keywords: ['sardine', 'sard', 'sardina'] },
  { nom: 'Ronono misokatra', unite: 'boîte', category: 'epicerie', keywords: ['concentré', 'lait', 'misokatra'] },
  { nom: 'Maggi', unite: 'pcs', category: 'epicerie', keywords: ['bouillon', 'cube', 'maggi'] },
  { nom: 'Vermisely', unite: 'paquet', category: 'epicerie', keywords: ['vermicelle', 'vermisely'] },
  
  // FITAOVANA (Produits ménagers)
  { nom: 'Savony', unite: 'pcs', category: 'menage', keywords: ['savon', 'sav', 'savony'] },
  { nom: 'Savony lamba', unite: 'kg', category: 'menage', keywords: ['lessive', 'less', 'lamba'] },
  { nom: 'Arina', unite: 'sac', category: 'menage', keywords: ['charbon', 'arina'] },
  { nom: 'Afokasoka', unite: 'boîte', category: 'menage', keywords: ['allumette', 'alim', 'afokasoka'] },
  { nom: 'Labozia', unite: 'pcs', category: 'menage', keywords: ['bougie', 'labozia'] },
  { nom: 'Taratasy fidiovana', unite: 'rouleaux', category: 'menage', keywords: ['papier', 'toilette', 'pq', 'taratasy'] },
];

// =============================================
// VRAIES RECETTES MALGACHES
// =============================================
const RECIPE_SUGGESTIONS: { [key: string]: { icon: string; name: string; items: { nom: string; unite: string }[] } } = {
  'romazava': {
    icon: '🥘',
    name: 'Romazava',
    items: [
      { nom: 'Hena omby', unite: 'kg' },
      { nom: 'Anamalaho', unite: 'fehiny' },
      { nom: 'Anamamy', unite: 'fehiny' },
      { nom: 'Anamafana', unite: 'fehiny' },
      { nom: 'Voatabia', unite: 'kg' },
      { nom: 'Tongolo', unite: 'pcs' },
      { nom: 'Sakamalao', unite: 'g' },
    ]
  },
  'ravitoto': {
    icon: '🥬',
    name: 'Ravitoto sy Henakisoa',
    items: [
      { nom: 'Ravitoto', unite: 'fehiny' },
      { nom: 'Hena kisoa', unite: 'kg' },
      { nom: 'Tongolo gasy', unite: 'loha' },
      { nom: 'Sakamalao', unite: 'g' },
      { nom: 'Menaka', unite: 'L' },
      { nom: 'Sira', unite: 'g' },
    ]
  },
  'henomby': {
    icon: '🥩',
    name: 'Hen\'omby ritra',
    items: [
      { nom: 'Hena omby', unite: 'kg' },
      { nom: 'Tongolo', unite: 'pcs' },
      { nom: 'Tongolo gasy', unite: 'loha' },
      { nom: 'Sakamalao', unite: 'g' },
      { nom: 'Voatabia', unite: 'kg' },
      { nom: 'Menaka', unite: 'L' },
    ]
  },
  'henakisoa': {
    icon: '🐷',
    name: 'Henan-kisoa sy Sakamalao',
    items: [
      { nom: 'Hena kisoa', unite: 'kg' },
      { nom: 'Sakamalao', unite: 'g' },
      { nom: 'Tongolo gasy', unite: 'loha' },
      { nom: 'Voatabia', unite: 'kg' },
      { nom: 'Tongolo', unite: 'pcs' },
      { nom: 'Menaka', unite: 'L' },
    ]
  },
  'vary': {
    icon: '🍲',
    name: 'Vary amin\'anana',
    items: [
      { nom: 'Vary fotsy', unite: 'kapoaka' },
      { nom: 'Anana', unite: 'fehiny' },
      { nom: 'Hena omby', unite: 'g' },
      { nom: 'Sakamalao', unite: 'g' },
      { nom: 'Sira', unite: 'g' },
    ]
  },
  'akoho': {
    icon: '🍗',
    name: 'Akoho sy Voanio',
    items: [
      { nom: 'Akoho gasy', unite: 'pcs' },
      { nom: 'Voanio', unite: 'pcs' },
      { nom: 'Voatabia', unite: 'kg' },
      { nom: 'Tongolo', unite: 'pcs' },
      { nom: 'Tongolo gasy', unite: 'loha' },
      { nom: 'Sakamalao', unite: 'g' },
    ]
  },
  'voanjobory': {
    icon: '🫘',
    name: 'Voanjobory sy Henakisoa',
    items: [
      { nom: 'Voanjobory', unite: 'kg' },
      { nom: 'Hena kisoa', unite: 'kg' },
      { nom: 'Tongolo', unite: 'pcs' },
      { nom: 'Voatabia', unite: 'kg' },
      { nom: 'Tongolo gasy', unite: 'loha' },
      { nom: 'Sira', unite: 'g' },
    ]
  },
  'lasopy': {
    icon: '🍜',
    name: 'Lasopy Malagasy',
    items: [
      { nom: 'Hena omby', unite: 'g' },
      { nom: 'Karaoty', unite: 'pcs' },
      { nom: 'Ovy', unite: 'kg' },
      { nom: 'Tsaramaso maintso', unite: 'g' },
      { nom: 'Vermisely', unite: 'paquet' },
      { nom: 'Tongolo', unite: 'pcs' },
    ]
  },
  'trondro': {
    icon: '🐟',
    name: 'Trondro sy Voatabia',
    items: [
      { nom: 'Trondro vaovao', unite: 'kg' },
      { nom: 'Voatabia', unite: 'kg' },
      { nom: 'Tongolo', unite: 'pcs' },
      { nom: 'Sakamalao', unite: 'g' },
      { nom: 'Menaka', unite: 'mL' },
    ]
  },
  'tsaramaso': {
    icon: '🫛',
    name: 'Tsaramaso sy Hena',
    items: [
      { nom: 'Tsaramaso maina', unite: 'kg' },
      { nom: 'Hena kisoa', unite: 'kg' },
      { nom: 'Tongolo', unite: 'pcs' },
      { nom: 'Voatabia', unite: 'kg' },
      { nom: 'Sira', unite: 'g' },
    ]
  },
  'kitoza': {
    icon: '🥓',
    name: 'Kitoza',
    items: [
      { nom: 'Hena omby', unite: 'kg' },
      { nom: 'Sira', unite: 'g' },
      { nom: 'Tongolo gasy', unite: 'loha' },
      { nom: 'Sakay', unite: 'g' },
    ]
  },
  'makamba': {
    icon: '🦐',
    name: 'Makamba sy Voanio',
    items: [
      { nom: 'Makamba', unite: 'kg' },
      { nom: 'Voanio', unite: 'pcs' },
      { nom: 'Voatabia', unite: 'kg' },
      { nom: 'Tongolo', unite: 'pcs' },
      { nom: 'Sakamalao', unite: 'g' },
      { nom: 'Sakay', unite: 'g' },
    ]
  },
  'foza': {
    icon: '🦀',
    name: 'Foza sy Voanio',
    items: [
      { nom: 'Foza', unite: 'kg' },
      { nom: 'Voanio', unite: 'pcs' },
      { nom: 'Voatabia', unite: 'kg' },
      { nom: 'Tongolo', unite: 'pcs' },
      { nom: 'Tongolo gasy', unite: 'loha' },
    ]
  },
  'mofo gasy': {
    icon: '🥞',
    name: 'Mofo Gasy',
    items: [
      { nom: 'Vary fotsy', unite: 'kapoaka' },
      { nom: 'Siramamy', unite: 'g' },
      { nom: 'Voanio', unite: 'pcs' },
      { nom: 'Menaka', unite: 'mL' },
    ]
  },
  'koba': {
    icon: '🍌',
    name: 'Koba Ravina',
    items: [
      { nom: 'Lafarina', unite: 'kg' },
      { nom: 'Akondro', unite: 'takelaka' },
      { nom: 'Voanjo', unite: 'kg' },
      { nom: 'Siramamy', unite: 'kg' },
    ]
  },
  'fety': {
    icon: '🎊',
    name: 'Fête Malgache',
    items: [
      { nom: 'Vary fotsy', unite: 'kg' },
      { nom: 'Hena omby', unite: 'kg' },
      { nom: 'Akoho gasy', unite: 'pcs' },
      { nom: 'Anana', unite: 'fehiny' },
      { nom: 'Lasary', unite: 'pot' },
      { nom: 'THB', unite: 'bouteille' },
      { nom: 'Toaka gasy', unite: 'bouteille' },
    ]
  },
  'petit-dejeuner': {
    icon: '🍳',
    name: 'Petit-déjeuner',
    items: [
      { nom: 'Mofo', unite: 'pcs' },
      { nom: 'Mofo gasy', unite: 'pcs' },
      { nom: 'Atody', unite: 'pcs' },
      { nom: 'Kafe', unite: 'g' },
      { nom: 'Ronono', unite: 'L' },
      { nom: 'Dibera', unite: 'g' },
      { nom: 'Siramamy', unite: 'g' },
    ]
  },
};

// Produits rapides malgaches
const QUICK_PRODUCTS = [
  { nom: 'Vary fotsy', icon: '🍚', unite: 'kg' },
  { nom: 'Mofo', icon: '🍞', unite: 'pcs' },
  { nom: 'Menaka', icon: '🫒', unite: 'L' },
  { nom: 'Atody', icon: '🥚', unite: 'pcs' },
  { nom: 'Hena omby', icon: '🥩', unite: 'kg' },
  { nom: 'Akoho', icon: '🍗', unite: 'pcs' },
  { nom: 'Voatabia', icon: '🍅', unite: 'kg' },
  { nom: 'Tongolo', icon: '🧅', unite: 'kg' },
];

// Nom par défaut pour les listes
const getDefaultListName = (language: string) => {
  const now = new Date();
  const dateStr = format(now, 'dd/MM/yyyy', { locale: language === 'en' ? enUS : fr });
  return language === 'en' ? `Shopping ${dateStr}` : `Courses ${dateStr}`;
};

export default function AchatDetails() {
  const { activeTheme, getStyles, isDarkMode } = useTheme();
  const { currency, language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const s = getStyles(styles);
  
  const params = useLocalSearchParams<{ id?: string, readOnly?: string, isNew?: string }>();
  const achatId = Number(params.id);
  const isReadOnly = params.readOnly === '1';
  const isNewList = params.isNew === '1';

  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const addInputRef = useRef<TextInput>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [achat, setAchat] = useState<Achat | null>(null);
  const [lignes, setLignes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [newItem, setNewItem] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isTitleVoiceActive, setIsTitleVoiceActive] = useState(false);
  
  // Suggestions
  const [allSuggestions, setAllSuggestions] = useState<SuggestedProduct[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SuggestedProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [recipeSuggestion, setRecipeSuggestion] = useState<{ icon: string; name: string; items: { nom: string; unite: string }[] } | null>(null);
  const [showRecipeSuggestion, setShowRecipeSuggestion] = useState(true);
  const [isListening, setIsListening] = useState(false);
  
  // Modal unifié
  const [detailModal, setDetailModal] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [modalData, setModalData] = useState<ModalData | null>(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Date Picker
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);

  // Validation Modal
  const [validateModal, setValidateModal] = useState(false);
  const [itemsWithoutPrice, setItemsWithoutPrice] = useState<any[]>([]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  // Reset suggestions quand on quitte/revient
  useFocusEffect(
    useCallback(() => {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
      setRecipeSuggestion(null);
      setShowRecipeSuggestion(true);
      
      return () => {
        setShowSuggestions(false);
        setFilteredSuggestions([]);
        setRecipeSuggestion(null);
      };
    }, [])
  );

  // Focus automatique sur le titre pour nouvelle liste
  useEffect(() => {
    if (!loading && isNewList && !isReadOnly && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 500);
    }
  }, [loading, isNewList, isReadOnly]);

  // Sauvegarde auto du nom par défaut si vide
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
       if (isReadOnly) return;
       
       if (lignes.length === 0 && isNewList) {
          try {
             const db = getDb();
             db.runSync('DELETE FROM Article WHERE idListeAchat = ?', [achatId]);
             db.runSync('DELETE FROM ListeAchat WHERE idListe = ?', [achatId]);
             console.log('[CLEANUP] Empty list deleted');
          } catch (err) { console.error(err); }
       } else {
          const finalTitle = title.trim() || getDefaultListName(language);
          try {
             getDb().runSync('UPDATE ListeAchat SET nomListe = ? WHERE idListe = ?', [finalTitle, achatId]);
             console.log('[SAVE] Title saved:', finalTitle);
          } catch(err) { console.error(err); }
       }
    });
    return unsubscribe;
  }, [navigation, lignes, title, achatId, isReadOnly, isNewList, language]);

  const removeList = () => {
    Alert.alert(
      language === 'en' ? 'Delete List' : 'Supprimer la liste',
      language === 'en' ? 'Are you sure you want to delete this list?' : 'Voulez-vous vraiment supprimer cette liste ?',
      [
        { text: language === 'en' ? 'Cancel' : 'Annuler', style: 'cancel' },
        { 
          text: language === 'en' ? 'Delete' : 'Supprimer', 
          style: 'destructive', 
          onPress: () => {
            try {
                const db = getDb();
                db.runSync('DELETE FROM Article WHERE idListeAchat = ?', [achatId]);
                db.runSync('DELETE FROM ListeAchat WHERE idListe = ?', [achatId]);
                router.back();
            } catch(e) { console.error(e); }
          }
        }
      ]
    );
  };

  const shareList = async () => {
    try {
        const listName = title.trim() || getDefaultListName(language);
        const itemsList = lignes.map((l: any) => `- ${l.quantite > 0 ? l.quantite + ' ' + (l.unite || '') + ' ' : ''}${l.libelleProduit}`).join('\n');
        const message = `${listName}\n\n${itemsList}`;
        await Share.share({
            message,
            title: listName
        });
    } catch (error) {
        console.log(error);
    }
  };

  useEffect(() => {
    if (!achatId) return;
    loadData();
    loadAllSuggestions();
    if (!isReadOnly) registerForPushNotificationsAsync();
  }, [achatId]);

  // Detect recipe based on title
  useEffect(() => {
    if (title.trim()) {
      const titleLower = title.toLowerCase().trim();
      let foundRecipe = RECIPE_SUGGESTIONS[titleLower];
      
      if (!foundRecipe) {
        for (const [key, value] of Object.entries(RECIPE_SUGGESTIONS)) {
          if (titleLower.includes(key) || key.includes(titleLower)) {
            foundRecipe = value;
            break;
          }
        }
      }
      
      if (foundRecipe) {
        setRecipeSuggestion(foundRecipe);
        setShowRecipeSuggestion(true);
      } else {
        setRecipeSuggestion(null);
      }
    } else {
      setRecipeSuggestion(null);
    }
  }, [title]);

  // Smart filtering
  const filterSuggestions = useCallback((searchTerm: string) => {
    if (searchTerm.trim().length < 1) {
      const topHistory = allSuggestions
        .filter(s => s.source === 'history')
        .slice(0, 6);
      
      if (topHistory.length > 0) {
        setFilteredSuggestions(topHistory);
        setShowSuggestions(true);
      } else {
        const popularDefaults = allSuggestions
          .filter(s => s.source === 'popular')
          .slice(0, 6);
        setFilteredSuggestions(popularDefaults);
        setShowSuggestions(popularDefaults.length > 0);
      }
      return;
    }

    const search = searchTerm.toLowerCase().trim();
    
    const historyMatches = allSuggestions
      .filter(s => s.source === 'history' && s.nom.toLowerCase().includes(search))
      .slice(0, 3);
    
    const popularMatches = MALAGASY_POPULAR_PRODUCTS
      .filter(p => {
        const nameMatch = p.nom.toLowerCase().includes(search);
        const keywordMatch = p.keywords.some(k => k.includes(search) || search.includes(k));
        const notInList = !lignes.some(l => l.libelleProduit.toLowerCase() === p.nom.toLowerCase());
        const notInHistory = !historyMatches.some(h => h.nom.toLowerCase() === p.nom.toLowerCase());
        return (nameMatch || keywordMatch) && notInList && notInHistory;
      })
      .slice(0, 4)
      .map(p => ({ 
        nom: p.nom, 
        lastPrice: 0, 
        count: 0, 
        unite: p.unite, 
        source: 'popular' as const 
      }));
    
    const combined = [...historyMatches, ...popularMatches].slice(0, 6);
    setFilteredSuggestions(combined);
    setShowSuggestions(combined.length > 0);
  }, [allSuggestions, lignes]);

  useEffect(() => {
    if (isInputFocused) {
      filterSuggestions(newItem);
    }
  }, [newItem, isInputFocused, filterSuggestions]);

  // Voice animations
  useEffect(() => {
    if (isListening || isTitleVoiceActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, isTitleVoiceActive]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      Vibration.vibrate(50);
      setTimeout(() => {
        setIsListening(false);
        Alert.alert(
          "Info", 
          language === 'en' 
            ? "Voice recognition requires native module." 
            : "La reconnaissance vocale nécessite un module natif."
        );
      }, 2000);
    }
  };

  const toggleTitleVoice = () => {
    if (isTitleVoiceActive) {
      setIsTitleVoiceActive(false);
    } else {
      setIsTitleVoiceActive(true);
      Vibration.vibrate(50);
      setTimeout(() => {
        setIsTitleVoiceActive(false);
        Alert.alert(
          "Info", 
          language === 'en' 
            ? "Voice recognition requires native module." 
            : "La reconnaissance vocale nécessite un module natif."
        );
      }, 2000);
    }
  };

  const loadData = () => {
    try {
      const db = getDb();
      const result = db.getAllSync('SELECT * FROM ListeAchat WHERE idListe = ?', [achatId]);
      const a = result[0] as Achat;
      if (!a) return;
      setAchat(a);
      
      const displayTitle = (a.nomListe === 'Nouvelle liste' || a.nomListe === 'New list' || !a.nomListe.trim()) 
        ? '' 
        : a.nomListe;
      setTitle(displayTitle);
      
      const items = db.getAllSync('SELECT a.*, p.libelle as libelleProduit FROM Article a JOIN Produit p ON p.idProduit = a.idProduit WHERE a.idListeAchat = ? ORDER BY a.idArticle ASC', [achatId]);
      
      setLignes(items.map((l: any) => ({ 
        ...l, 
        checked: l.prixUnitaire > 0,
        hasQtyOnly: l.quantite > 0 && l.prixUnitaire === 0
      })));
    } catch (e) { console.error('[ACHAT] Error loadData:', e); } finally { setLoading(false); }
  };

  const loadAllSuggestions = () => {
    try {
      const db = getDb();
      
      const historyResult = db.getAllSync(`
        SELECT p.libelle as nom, a.prixUnitaire as lastPrice, a.unite, COUNT(*) as count 
        FROM Article a 
        JOIN Produit p ON p.idProduit = a.idProduit
        WHERE a.prixUnitaire > 0 
        GROUP BY LOWER(p.libelle) 
        ORDER BY count DESC 
        LIMIT 100
      `);
      
      const historySuggestions: SuggestedProduct[] = (historyResult as any[]).map(r => ({
        ...r,
        source: 'history' as const
      }));
      
      const historyNames = new Set(historySuggestions.map(h => h.nom.toLowerCase()));
      
      const popularSuggestions: SuggestedProduct[] = MALAGASY_POPULAR_PRODUCTS
        .filter(p => !historyNames.has(p.nom.toLowerCase()))
        .map(p => ({
          nom: p.nom,
          lastPrice: 0,
          count: 0,
          unite: p.unite,
          source: 'popular' as const
        }));
      
      setAllSuggestions([...historySuggestions, ...popularSuggestions]);
    } catch (e) { console.error(e); }
  };

  const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
    if (type === 'success') Vibration.vibrate(50);
    else if (type === 'medium') Vibration.vibrate(30);
    else Vibration.vibrate(10);
  };

  const shakeTitle = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const playSuccessAnimation = () => {
    triggerHaptic('success');
    Animated.sequence([
      Animated.timing(successAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(successAnim, { toValue: 0, duration: 200, delay: 500, useNativeDriver: true }),
    ]).start();
  };

  const formatMoney = (value: number) => {
    if (!value && value !== 0) return '0';
    return Number(value).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const validateTitle = (): boolean => {
    setTitleError('');
    return true;
  };

  const saveTitle = () => {
    if (isReadOnly) return;
    if (!achat) return;
    
    const finalTitle = title.trim() || getDefaultListName(language);
    getDb().runSync('UPDATE ListeAchat SET nomListe = ? WHERE idListe = ?', [finalTitle, achatId]);
    setAchat({ ...achat, nomListe: finalTitle });
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    setTitleError('');
  };

  const addItem = (productName: string, unite?: string) => {
    if (isReadOnly) return;
    
    const nom = productName.trim();
    if (!nom) return;
    
    const exists = lignes.some(l => l.libelleProduit.toLowerCase() === nom.toLowerCase());
    if (exists) {
      Alert.alert(
        language === 'en' ? 'Already exists' : 'Déjà existant',
        language === 'en' ? 'This product is already in the list' : 'Ce produit est déjà dans la liste'
      );
      return;
    }
    
    triggerHaptic('light');
    try {
      const db = getDb();
      let productId;
      const existing = db.getAllSync<{idProduit: number}>('SELECT idProduit FROM Produit WHERE libelle = ?', [nom]);
      if (existing && existing.length > 0) {
          productId = existing[0].idProduit;
      } else {
          const res = db.runSync('INSERT INTO Produit (libelle, unite) VALUES (?, ?)', [nom, unite || 'pcs']);
          productId = res.lastInsertRowId;
      }

      const r = db.runSync(
        'INSERT INTO Article (idListeAchat, idProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, 0, 0, 0, ?)', 
        [achatId, productId, unite || 'pcs']
      );
      const newLine = { 
        idArticle: r.lastInsertRowId,
        idProduit: productId,
        libelleProduit: nom, 
        quantite: 0,
        prixUnitaire: 0, 
        prixTotal: 0, 
        unite: unite || 'pcs', 
        checked: false,
        hasQtyOnly: false 
      };
      setLignes(prev => [...prev, newLine]);
      setNewItem('');
      setShowSuggestions(false);
    } catch(e) { console.error(e); }
  };

  const addFromRecipeSuggestion = (item: { nom: string; unite: string }) => {
    addItem(item.nom, item.unite);
  };

  const addAllRecipeIngredients = () => {
    if (!recipeSuggestion) return;
    
    let addedCount = 0;
    const db = getDb();
    
    recipeSuggestion.items.forEach(item => {
      const exists = lignes.some(l => l.libelleProduit.toLowerCase() === item.nom.toLowerCase());
      if (!exists) {
        try {
          let productId;
          const existing = db.getAllSync<{idProduit: number}>('SELECT idProduit FROM Produit WHERE libelle = ?', [item.nom]);
          if (existing && existing.length > 0) {
              productId = existing[0].idProduit;
          } else {
              const res = db.runSync('INSERT INTO Produit (libelle, unite) VALUES (?, ?)', [item.nom, item.unite]);
              productId = res.lastInsertRowId;
          }

          const r = db.runSync(
            'INSERT INTO Article (idListeAchat, idProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, 0, 0, 0, ?)', 
            [achatId, productId, item.unite]
          );
          const newLine = { 
            idArticle: r.lastInsertRowId,
            idProduit: productId,
            libelleProduit: item.nom, 
            quantite: 0, 
            prixUnitaire: 0, 
            prixTotal: 0, 
            unite: item.unite, 
            checked: false,
            hasQtyOnly: false 
          };
          setLignes(prev => [...prev, newLine]);
          addedCount++;
        } catch(e) { console.error(e); }
      }
    });
    
    if (addedCount > 0) {
      triggerHaptic('success');
      Alert.alert(
        language === 'en' ? 'Added!' : 'Ajouté !',
        language === 'en' 
          ? `${addedCount} ingredient(s) added` 
          : `${addedCount} ingrédient(s) ajouté(s)`
      );
    }
  };

  const addFromSuggestion = (s: SuggestedProduct) => {
    addItem(s.nom, s.unite);
  };

  const addFromQuickChip = (p: typeof QUICK_PRODUCTS[0]) => {
    addItem(p.nom, p.unite);
  };

  const handleSubmitItem = () => {
    if (newItem.trim()) {
      addItem(newItem);
    }
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    filterSuggestions(newItem);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      setIsInputFocused(false);
      setShowSuggestions(false);
    }, 200);
  };

  const openDetailModal = (item: any, type: 'add' | 'edit') => {
    if (isReadOnly) return;
    
    const suggestion = allSuggestions.find(s => s.nom.toLowerCase() === item.libelleProduit.toLowerCase());
    
    setModalKey(prev => prev + 1);
    
    const freshData: ModalData = {
      type: type,
      itemId: item.idArticle,
      nom: item.libelleProduit,
      qty: item.quantite > 0 ? String(item.quantite) : '',
      prix: item.prixUnitaire > 0 ? String(item.prixUnitaire) : '',
      unite: item.unite || 'pcs',
      suggestedPrice: suggestion?.lastPrice || 0,
    };
    
    setModalData(freshData);
    setDetailModal(true);
    triggerHaptic('light');
  };

  const closeDetailModal = () => {
    setDetailModal(false);
    setTimeout(() => {
      setModalData(null);
    }, 300);
  };

  const saveDetailModal = () => {
    if (!modalData) return;
    
    const qty = Number.parseFloat(modalData.qty) || 0;
    const prix = Number.parseFloat(modalData.prix) || 0;
    const unite = modalData.unite.trim() || 'pcs';
    const nom = modalData.nom.trim();
    const total = qty * prix;
    
    if (modalData.type === 'edit' && !nom) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Erreur',
        language === 'en' ? 'Product name is required' : 'Le nom du produit est obligatoire'
      );
      return;
    }
    
    if (modalData.type === 'add' && qty <= 0) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Erreur', 
        language === 'en' ? 'Please enter a quantity' : 'Veuillez saisir une quantité'
      );
      return;
    }
    
    const idx = lignes.findIndex(l => l.idArticle === modalData.itemId);
    if (idx === -1) return;
    
    const l = lignes[idx];
    const db = getDb();
    
    let productId = l.idProduit;
    
    if (modalData.type === 'edit' && nom !== l.libelleProduit) {
      const existing = db.getAllSync<{idProduit: number}>('SELECT idProduit FROM Produit WHERE libelle = ?', [nom]);
      if (existing && existing.length > 0) {
        productId = existing[0].idProduit;
      } else {
        const res = db.runSync('INSERT INTO Produit (libelle, unite) VALUES (?, ?)', [nom, unite]);
        productId = res.lastInsertRowId;
      }
    }
    
    db.runSync(
      'UPDATE Article SET idProduit=?, quantite=?, prixUnitaire=?, prixTotal=?, unite=? WHERE idArticle=?', 
      [productId, qty, prix, total, unite, l.idArticle]
    );
    
    const updatedLignes = [...lignes];
    updatedLignes[idx] = { 
      ...l, 
      libelleProduit: nom,
      idProduit: productId,
      quantite: qty, 
      prixUnitaire: prix,
      prixTotal: total,
      unite: unite,
      checked: prix > 0,
      hasQtyOnly: qty > 0 && prix === 0
    };
    setLignes(updatedLignes);
    
    closeDetailModal();
    
    if (prix > 0) {
      playSuccessAnimation();
    } else {
      triggerHaptic('light');
    }
  };

  const uncheckItem = (item: any) => {
    if (isReadOnly) return;
    const idx = lignes.findIndex(l => l.idArticle === item.idArticle);
    if (idx === -1) return;
    triggerHaptic('light');
    const l = lignes[idx];
    getDb().runSync('UPDATE Article SET prixUnitaire=0, prixTotal=0 WHERE idArticle=?', [l.idArticle]);
    const updatedLignes = [...lignes];
    updatedLignes[idx] = { ...l, prixUnitaire: 0, prixTotal: 0, checked: false, hasQtyOnly: l.quantite > 0 };
    setLignes(updatedLignes);
  };

  const askDelete = (item: any) => {
    if (isReadOnly) return;
    triggerHaptic('medium');
    setItemToDelete(item);
    setDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    getDb().runSync('DELETE FROM Article WHERE idArticle=?', [itemToDelete.idArticle]);
    setLignes(lignes.filter(l => l.idArticle !== itemToDelete.idArticle));
    setDeleteModal(false);
    setItemToDelete(null);
    triggerHaptic('medium');
  };

  const checkCanValidate = () => {
    const itemsNeedPrice = lignes.filter(l => l.quantite > 0 && l.prixUnitaire === 0);
    const itemsNotProcessed = lignes.filter(l => l.quantite === 0);
    
    if (itemsNotProcessed.length > 0) {
      Alert.alert(
        language === 'en' ? 'Incomplete' : 'Incomplet',
        language === 'en' 
          ? `${itemsNotProcessed.length} item(s) not processed` 
          : `${itemsNotProcessed.length} article(s) non traité(s)`
      );
      return;
    }
    
    if (itemsNeedPrice.length > 0) {
      setItemsWithoutPrice(itemsNeedPrice);
      setValidateModal(true);
      return;
    }
    
    playSuccessAnimation();
    Alert.alert(
      language === 'en' ? 'Success' : 'Succès',
      language === 'en' ? 'List validated!' : 'Liste validée !'
    );
  };

  const onPurchaseDateChange = (event: any, selectedDate?: Date) => {
    if (!achat) return;
    setShowPurchaseDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const iso = selectedDate.toISOString();
      getDb().runSync('UPDATE ListeAchat SET dateAchat=? WHERE idListe=?', [iso, achatId]);
      setAchat({ ...achat, dateAchat: iso });
    }
  };

  // Calculations
  const unchecked = lignes.filter(l => !l.checked);
  const checked = lignes.filter(l => l.checked);
  const pending = lignes.filter(l => l.hasQtyOnly);
  const totalDepense = lignes.reduce((sum, l) => sum + (l.prixTotal || 0), 0);
  const progressRatio = lignes.length > 0 ? checked.length / lignes.length : 0;
  const totalItems = lignes.length;

  if (loading) return (
    <View style={[s.container, s.center]}>
      <ActivityIndicator size="large" color={activeTheme.primary} />
    </View>
  );
  
  if (!achat) return null;

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      
      <Animated.View 
        pointerEvents="none" 
        style={[StyleSheet.absoluteFillObject, { 
          backgroundColor: activeTheme.primary, 
          opacity: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }), 
          zIndex: 1000 
        }]} 
      />
      
      {/* HEADER */}
      <LinearGradient colors={activeTheme.gradient as any} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.push('/')} style={s.breadcrumb}>
          <Ionicons name="home-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={s.breadcrumbText}>{t('home')}</Text>
          <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.8)" />
          <Text style={[s.breadcrumbText, { fontWeight: 'bold' }]}>
            {isReadOnly ? (language === 'en' ? 'History' : 'Historique') : t('my_list')}
          </Text>
        </TouchableOpacity>
        
        <View style={s.headerContent}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            {isReadOnly ? (
              <View>
                <Text style={s.headerTitle}>{title || getDefaultListName(language)}</Text>
                <Text style={s.headerDate}>
                  {format(new Date(achat.dateAchat), 'EEEE dd MMMM yyyy', { locale: language === 'en' ? enUS : fr })}
                </Text>
              </View>
            ) : (
              <View>
                <Animated.View style={[s.titleRow, { transform: [{ translateX: shakeAnim }] }]}>
                  <TextInput
                    ref={titleInputRef}
                    style={[s.titleInput, titleError ? s.titleInputError : undefined]}
                    value={title}
                    onChangeText={handleTitleChange}
                    onBlur={saveTitle}
                    placeholder={language === 'en' ? 'Enter list name...' : 'Nom de la liste...'}
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    cursorColor="#ffffff"
                    selectionColor="rgba(255,255,255,0.4)"
                  />
                  
                  {/* Bouton reconnaissance vocale pour le titre */}
                  <TouchableOpacity onPress={toggleTitleVoice} style={s.titleVoiceBtn}>
                    <Animated.View style={{ transform: [{ scale: isTitleVoiceActive ? pulseAnim : 1 }] }}>
                      <Ionicons 
                        name={isTitleVoiceActive ? "mic" : "mic-outline"} 
                        size={20} 
                        color={isTitleVoiceActive ? "#EF4444" : "rgba(255,255,255,0.8)"} 
                      />
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
                
                {titleError ? (
                  <View style={s.errorContainer}>
                    <Ionicons name="alert-circle" size={12} color="#FECACA" />
                    <Text style={s.errorText}>{titleError}</Text>
                  </View>
                ) : null}
                
                <TouchableOpacity onPress={() => setShowPurchaseDatePicker(true)} style={s.dateButton}>
                  <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={s.headerDate}>
                    {format(new Date(achat.dateAchat), 'dd MMM yyyy', { locale: language === 'en' ? enUS : fr })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!isReadOnly && totalItems > 0 && (
            <TouchableOpacity 
              onPress={checkCanValidate} 
              style={[s.validateBtn, { backgroundColor: checked.length === totalItems ? '#10B981' : 'rgba(255,255,255,0.2)' }]}
            >
              <Ionicons name="checkmark-done" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <Animated.View style={[s.contentContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        
        {isReadOnly ? (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={s.ticketCard}>
              <View style={s.ticketHeader}>
                <Ionicons name="receipt" size={24} color={activeTheme.primary} />
                <Text style={s.ticketTitle}>{language === 'en' ? 'SUMMARY' : 'RÉSUMÉ'}</Text>
              </View>
              <View style={s.dashedLine} />
              {lignes.map((item) => (
                <View key={item.idArticle} style={s.ticketRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.ticketItemName}>{item.libelleProduit}</Text>
                    <Text style={s.ticketItemSub}>{item.quantite} {item.unite} × {formatMoney(item.prixUnitaire)}</Text>
                  </View>
                  <Text style={s.ticketItemPrice}>{formatMoney(item.prixTotal)} {currency}</Text>
                </View>
              ))}
              <View style={s.dashedLine} />
              <View style={s.ticketTotalRow}>
                <Text style={s.ticketTotalLabel}>TOTAL</Text>
                <Text style={[s.ticketTotalValue, { color: activeTheme.primary }]}>{formatMoney(totalDepense)} {currency}</Text>
              </View>
            </View>
          </ScrollView>
        ) : (
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : undefined} 
            style={{ flex: 1 }}
            keyboardVerticalOffset={100}
          >
            <ScrollView 
              ref={scrollViewRef} 
              contentContainerStyle={{ paddingBottom: 100 }} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              
              {/* SUMMARY CARD */}
              <View style={{ paddingHorizontal: 20, marginTop: 15 }}>
                <LinearGradient 
                  colors={activeTheme.gradient as any}
                  style={s.summaryCard}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <View style={s.summaryRow}>
                    <View>
                      <Text style={s.summaryLabel}>TOTAL</Text>
                      <Text style={s.summaryTotal}>{formatMoney(totalDepense)} <Text style={s.summaryCurrency}>{currency}</Text></Text>
                    </View>
                    <View style={s.summaryRight}>
                      <Text style={s.progressText}>{checked.length}/{totalItems}</Text>
                      <Text style={s.progressLabel}>{language === 'en' ? 'Done' : 'Terminés'}</Text>
                    </View>
                  </View>
                  <View style={s.progressBarBg}>
                    <View style={[s.progressBarFill, { width: `${progressRatio * 100}%` }]} />
                  </View>
                  {pending.length > 0 && (
                    <View style={s.pendingBadge}>
                      <Ionicons name="time-outline" size={12} color="#FCD34D" />
                      <Text style={s.pendingText}>{pending.length} {language === 'en' ? 'awaiting price' : 'sans prix'}</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>

              {/* ADD ITEM INPUT */}
              <View style={s.addSection}>
                <Text style={s.addSectionTitle}>
                  {language === 'en' ? 'Add product' : 'Ajouter un produit'}
                </Text>
                <View style={[s.addInputContainer, { borderColor: activeTheme.primary + '50' }]}>
                  <Ionicons name="add-circle-outline" size={22} color={activeTheme.primary} />
                  <TextInput 
                    ref={addInputRef}
                    style={s.addInput} 
                    placeholder={language === 'en' ? 'Product name...' : 'Nom du produit...'} 
                    placeholderTextColor={s.textSec.color} 
                    value={newItem} 
                    onChangeText={setNewItem}
                    onSubmitEditing={handleSubmitItem}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    returnKeyType="done"
                  />
                  {newItem.trim() ? (
                    <TouchableOpacity onPress={handleSubmitItem} style={[s.addBtn, { backgroundColor: activeTheme.primary }]}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={toggleListening} style={{ padding: 6 }}>
                        <Animated.View style={{ transform: [{ scale: isListening ? pulseAnim : 1 }] }}>
                            <Ionicons name={isListening ? "mic" : "mic-outline"} size={22} color={isListening ? "#EF4444" : activeTheme.primary} />
                        </Animated.View>
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* SMART SUGGESTIONS DROPDOWN */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <View style={s.suggestionsBox}>
                    <View style={s.suggestionsHeaderRow}>
                      <Text style={s.suggestionsTitle}>
                        {newItem.trim() 
                          ? (language === 'en' ? 'Suggestions' : 'Suggestions')
                          : (language === 'en' ? 'Your frequent purchases' : 'Vos achats fréquents')
                        }
                      </Text>
                    </View>
                    {filteredSuggestions.map((sug, sugIdx) => {
                      const alreadyInList = lignes.some(l => l.libelleProduit.toLowerCase() === sug.nom.toLowerCase());
                      return (
                        <TouchableOpacity 
                          key={`sug-${sug.nom}-${sugIdx}`} 
                          style={[s.suggestionRow, alreadyInList && s.suggestionRowDisabled]}
                          onPress={() => !alreadyInList && addFromSuggestion(sug)}
                          disabled={alreadyInList}
                        >
                          <View style={s.suggestionIconBox}>
                            <Ionicons 
                              name={sug.source === 'history' ? 'time-outline' : 'storefront-outline'} 
                              size={16} 
                              color={alreadyInList ? '#9CA3AF' : (sug.source === 'history' ? activeTheme.primary : '#10B981')} 
                            />
                          </View>
                          <View style={s.suggestionContent}>
                            <Text style={[s.suggestionName, alreadyInList && s.suggestionNameDisabled]}>
                              {sug.nom}
                            </Text>
                            <Text style={s.suggestionMeta}>
                              {sug.source === 'history' 
                                ? (language === 'en' ? `Bought ${sug.count}x` : `Acheté ${sug.count}x`)
                                : (language === 'en' ? 'Popular' : 'Populaire')
                              }
                            </Text>
                          </View>
                          <Text style={s.suggestionUnit}>{sug.unite}</Text>
                          {sug.lastPrice > 0 && (
                            <Text style={s.suggestionPrice}>{formatMoney(sug.lastPrice)} {currency}</Text>
                          )}
                          {alreadyInList ? (
                            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                          ) : (
                            <Ionicons name="add-circle-outline" size={18} color={activeTheme.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                
                {/* Quick chips */}
                {!isInputFocused && !recipeSuggestion && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickChipsScroll}>
                    {QUICK_PRODUCTS.map((p, pIdx) => {
                      const added = lignes.some(l => l.libelleProduit.toLowerCase() === p.nom.toLowerCase());
                      return (
                        <TouchableOpacity 
                          key={`quick-${p.nom}-${pIdx}`} 
                          style={[s.quickChip, added && s.quickChipAdded]} 
                          onPress={() => !added && addFromQuickChip(p)}
                          disabled={added}
                        >
                          <Text style={s.quickChipEmoji}>{p.icon}</Text>
                          <Text style={[s.quickChipText, added && { color: '#10B981' }]}>{p.nom}</Text>
                          {added && <Ionicons name="checkmark" size={14} color="#10B981" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>

              {/* RECIPE SUGGESTIONS */}
              {recipeSuggestion && showRecipeSuggestion && (
                <View style={s.recipeCard}>
                  <View style={s.recipeHeader}>
                    <Text style={s.recipeEmoji}>{recipeSuggestion.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.recipeTitle}>{recipeSuggestion.name}</Text>
                      <Text style={s.recipeSubtitle}>
                        {recipeSuggestion.items.length} {language === 'en' ? 'ingredients' : 'ingrédients'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowRecipeSuggestion(false)}>
                      <Ionicons name="close" size={22} color={s.textSec.color} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={s.recipeChips}>
                    {recipeSuggestion.items.map((item, idx) => {
                      const added = lignes.some(l => l.libelleProduit.toLowerCase() === item.nom.toLowerCase());
                      return (
                                                <TouchableOpacity 
                          key={`recipe-${recipeSuggestion.name}-${item.nom}-${idx}`}
                          style={[s.recipeChip, added && s.recipeChipAdded]}
                          onPress={() => !added && addFromRecipeSuggestion(item)}
                          disabled={added}
                        >
                          <Ionicons 
                            name={added ? "checkmark-circle" : "add-circle-outline"} 
                            size={16} 
                            color={added ? '#10B981' : activeTheme.primary} 
                          />
                          <Text style={[s.recipeChipText, added && { color: '#10B981' }]}>{item.nom}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  
                  <TouchableOpacity style={[s.addAllBtn, { backgroundColor: activeTheme.primary }]} onPress={addAllRecipeIngredients}>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={s.addAllBtnText}>{language === 'en' ? 'Add all' : 'Tout ajouter'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TO PROCESS SECTION */}
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <View style={[s.sectionIcon, { backgroundColor: activeTheme.primary + '15' }]}>
                    <Ionicons name="cart-outline" size={16} color={activeTheme.primary} />
                  </View>
                  <Text style={s.sectionTitle}>{language === 'en' ? 'TO PROCESS' : 'À TRAITER'}</Text>
                  <View style={s.badge}><Text style={s.badgeText}>{unchecked.length}</Text></View>
                </View>
                
                {unchecked.length === 0 && checked.length === 0 && (
                  <View style={s.emptyState}>
                    <Ionicons name="basket-outline" size={40} color={s.textSec.color} />
                    <Text style={s.emptyText}>{language === 'en' ? 'No items yet' : 'Aucun article'}</Text>
                    <Text style={s.emptyHint}>
                      {language === 'en' 
                        ? 'Type a product name or select from suggestions' 
                        : 'Saisissez un nom ou choisissez dans les suggestions'}
                    </Text>
                  </View>
                )}

                {unchecked.map((item, unchkIdx) => (
                  <TouchableOpacity 
                    key={`unchecked-${item.idArticle}-${unchkIdx}`} 
                    style={[s.itemCard, item.hasQtyOnly && s.itemCardPending]}
                    onPress={() => openDetailModal(item, 'add')}
                  >
                    <View style={[s.itemCheck, { borderColor: activeTheme.primary }]}>
                      <Ionicons name="add" size={12} color={activeTheme.primary} style={{ opacity: 0.4 }} />
                    </View>
                    
                    <View style={s.itemContent}>
                      <Text style={s.itemName}>{item.libelleProduit}</Text>
                      {item.quantite > 0 ? (
                        <View style={s.itemTags}>
                          <View style={[s.itemTag, { backgroundColor: activeTheme.primary + '15' }]}>
                            <Text style={[s.itemTagText, { color: activeTheme.primary }]}>{item.quantite} {item.unite}</Text>
                          </View>
                          {item.hasQtyOnly && (
                            <View style={[s.itemTag, { backgroundColor: '#FEF3C7' }]}>
                              <Text style={[s.itemTagText, { color: '#D97706' }]}>{language === 'en' ? 'No price' : 'Sans prix'}</Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <Text style={s.itemHint}>{language === 'en' ? 'Tap to add details' : 'Appuyez pour compléter'}</Text>
                      )}
                    </View>

                    <View style={s.itemActions}>
                      <TouchableOpacity 
                        onPress={(e) => { e.stopPropagation(); openDetailModal(item, 'edit'); }} 
                        style={[s.actionBtn, s.editActionBtn]}
                      >
                        <Ionicons name="pencil" size={16} color={activeTheme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={(e) => { e.stopPropagation(); askDelete(item); }} 
                        style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* COMPLETED SECTION */}
              {checked.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <View style={[s.sectionIcon, { backgroundColor: '#10B98115' }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    </View>
                    <Text style={s.sectionTitle}>{language === 'en' ? 'COMPLETED' : 'TERMINÉS'}</Text>
                    <View style={[s.badge, { backgroundColor: '#10B981' }]}><Text style={[s.badgeText, { color: '#fff' }]}>{checked.length}</Text></View>
                  </View>
                  
                  {checked.map((item, itemIdx) => (
                    <View key={`checked-${item.idArticle}-${itemIdx}`} style={s.doneCard}>
                      <TouchableOpacity onPress={() => uncheckItem(item)}>
                        <Ionicons name="checkmark-circle" size={26} color="#10B981" />
                      </TouchableOpacity>
                      
                      <View style={s.doneContent}>
                        <Text style={s.doneName}>{item.libelleProduit}</Text>
                        <Text style={s.doneDetails}>{item.quantite} {item.unite} × {formatMoney(item.prixUnitaire)} {currency}</Text>
                        <Text style={[s.doneTotal, { color: activeTheme.primary }]}>{formatMoney(item.prixTotal)} {currency}</Text>
                      </View>
                      
                      <View style={s.itemActions}>
                        <TouchableOpacity 
                          onPress={() => openDetailModal(item, 'edit')} 
                          style={[s.actionBtn, s.editActionBtn]}
                        >
                          <Ionicons name="pencil" size={16} color={activeTheme.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => askDelete(item)} style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]}>
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Animated.View>

      {/* MODALS */}
      
      <ConfirmModal 
        visible={deleteModal} 
        title={language === 'en' ? 'Delete' : 'Supprimer'} 
        message={language === 'en' ? 'Delete this item?' : 'Supprimer cet article ?'} 
        onConfirm={confirmDelete} 
        onCancel={() => setDeleteModal(false)} 
        confirmText={language === 'en' ? 'Delete' : 'Supprimer'} 
        cancelText={language === 'en' ? 'Cancel' : 'Annuler'} 
        type="danger" 
        theme={activeTheme} 
        isDarkMode={isDarkMode} 
      />

      {/* Modal unifié pour ajout/modification */}
      <Modal visible={detailModal} transparent animationType="fade">
        <View style={s.backdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalBox}>
            {modalData && (
              <View key={`modal-content-${modalKey}`}>
                <View style={[s.modalHeader, modalData.type === 'edit' ? s.modalHeaderEdit : s.modalHeaderAdd]}>
                  <View style={[
                    s.modalIconContainer, 
                    { backgroundColor: modalData.type === 'edit' ? '#3B82F620' : '#10B98120' }
                  ]}>
                    <Ionicons 
                      name={modalData.type === 'edit' ? 'create' : 'add-circle'} 
                      size={24} 
                      color={modalData.type === 'edit' ? '#3B82F6' : '#10B981'} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalTitle}>
                      {modalData.type === 'edit' 
                        ? (language === 'en' ? 'Edit item' : 'Modifier l\'article')
                        : (language === 'en' ? 'Add details' : 'Ajouter les détails')
                      }
                    </Text>
                    <Text style={s.modalSubtitleSmall}>
                      {modalData.type === 'edit' 
                        ? (language === 'en' ? 'Change name, quantity, or price' : 'Modifier le nom, la quantité ou le prix')
                        : (language === 'en' ? 'Enter quantity and optional price' : 'Saisissez la quantité et le prix optionnel')
                      }
                    </Text>
                  </View>
                </View>

                {/* Nom du produit */}
                {modalData.type === 'add' ? (
                  <View style={s.productNameBox}>
                    <Text style={s.productName}>{modalData.nom}</Text>
                  </View>
                ) : (
                  <>
                    <Text style={s.label}>{language === 'en' ? 'Name' : 'Nom'} *</Text>
                    <TextInput 
                      style={s.input} 
                      value={modalData.nom} 
                      onChangeText={t => setModalData({...modalData, nom: t})} 
                    />
                  </>
                )}
                
                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>{language === 'en' ? 'Quantity' : 'Quantité'} *</Text>
                    <TextInput 
                      style={s.input} 
                      keyboardType="numeric" 
                      value={modalData.qty} 
                      onChangeText={t => setModalData({...modalData, qty: t})} 
                      placeholder={language === 'en' ? 'Enter qty' : 'Saisir qté'}
                      placeholderTextColor={s.textSec.color}
                      autoFocus={modalData.type === 'add'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>{language === 'en' ? 'Unit' : 'Unité'}</Text>
                    <TextInput 
                      style={s.input} 
                      value={modalData.unite} 
                      onChangeText={t => setModalData({...modalData, unite: t})} 
                      placeholder="pcs" 
                      placeholderTextColor={s.textSec.color} 
                    />
                  </View>
                </View>
                
                <Text style={s.label}>
                  {language === 'en' ? 'Unit Price' : 'Prix unitaire'} ({currency}) 
                  <Text style={s.optional}> ({language === 'en' ? 'optional' : 'optionnel'})</Text>
                </Text>
                <TextInput 
                  style={s.input} 
                  keyboardType="numeric" 
                  value={modalData.prix} 
                  onChangeText={t => setModalData({...modalData, prix: t})} 
                  placeholder={modalData.suggestedPrice ? `${language === 'en' ? 'Suggested' : 'Suggéré'}: ${formatMoney(modalData.suggestedPrice)}` : '0'} 
                  placeholderTextColor={s.textSec.color} 
                />
                
                {modalData.suggestedPrice > 0 && !modalData.prix && (
                  <TouchableOpacity 
                    onPress={() => setModalData({...modalData, prix: String(modalData.suggestedPrice)})}
                    style={[s.suggestionBtn, { backgroundColor: activeTheme.primary + '15' }]}
                  >
                    <Ionicons name="flash" size={16} color={activeTheme.primary} />
                    <Text style={[s.suggestionBtnText, { color: activeTheme.primary }]}>
                      {language === 'en' ? 'Use' : 'Utiliser'}: {formatMoney(modalData.suggestedPrice)} {currency}
                    </Text>
                  </TouchableOpacity>
                )}
                
                {modalData.prix && Number(modalData.prix) > 0 && (
                  <View style={s.totalPreview}>
                    <Text style={s.totalPreviewLabel}>Total</Text>
                    <Text style={[s.totalPreviewValue, { color: activeTheme.primary }]}>
                      {formatMoney((Number(modalData.qty) || 0) * (Number(modalData.prix) || 0))} {currency}
                    </Text>
                  </View>
                )}
                
                <View style={s.infoBox}>
                  <Ionicons name="information-circle-outline" size={16} color={s.textSec.color} />
                  <Text style={s.infoText}>
                    {language === 'en' 
                      ? 'Price is optional. Required to finalize list.' 
                      : 'Le prix est optionnel. Requis pour finaliser la liste.'}
                  </Text>
                </View>

                <View style={s.modalActions}>
                  <TouchableOpacity onPress={closeDetailModal} style={s.cancelBtn}>
                    <Text style={s.cancelBtnText}>{language === 'en' ? 'Cancel' : 'Annuler'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={saveDetailModal} 
                    style={[
                      s.saveBtn, 
                      { backgroundColor: modalData.type === 'edit' ? '#3B82F6' : activeTheme.primary }
                    ]}
                  >
                    <Text style={s.saveBtnText}>
                      {modalData.type === 'edit' 
                        ? (language === 'en' ? 'Update' : 'Modifier')
                        : (language === 'en' ? 'Save' : 'Enregistrer')
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Validation Modal */}
      <Modal visible={validateModal} transparent animationType="fade">
        <View style={s.backdrop}>
          <View style={s.modalBox}>
            <View style={[s.modalIconBig, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="warning" size={32} color="#D97706" />
            </View>
            <Text style={s.modalTitle}>{language === 'en' ? 'Missing prices' : 'Prix manquants'}</Text>
            <Text style={s.modalSubtitle}>
              {language === 'en' ? 'Add prices to these items:' : 'Ajoutez un prix à ces articles :'}
            </Text>
            
            <View style={s.validateList}>
              {itemsWithoutPrice.map((item, vIdx) => (
                <TouchableOpacity 
                  key={`validate-${item.idArticle}-${vIdx}`} 
                  style={s.validateItem}
                  onPress={() => { setValidateModal(false); setTimeout(() => openDetailModal(item, 'add'), 200); }}
                >
                  <Ionicons name="alert-circle" size={18} color="#D97706" />
                  <Text style={s.validateItemText}>{item.libelleProduit}</Text>
                  <Ionicons name="chevron-forward" size={18} color={s.textSec.color} />
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity onPress={() => setValidateModal(false)} style={[s.saveBtn, { backgroundColor: activeTheme.primary }]}>
              <Text style={s.saveBtnText}>{language === 'en' ? 'Understood' : 'Compris'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showPurchaseDatePicker && (
        <DateTimePicker value={new Date(achat.dateAchat)} mode="date" onChange={onPurchaseDateChange} />
      )}
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { paddingBottom: 50, paddingHorizontal: 20 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  breadcrumbText: { color: '#fff', fontSize: 12, marginLeft: 4 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12 },
  validateBtn: { padding: 10, borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleInput: { 
    flex: 1,
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff', 
    borderBottomWidth: 2, 
    borderBottomColor: 'rgba(255,255,255,0.3)', 
    paddingVertical: 4 
  },
  titleInputError: { borderBottomColor: '#FECACA' },
  titleVoiceBtn: { 
    padding: 8, 
    marginLeft: 8, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    borderRadius: 10 
  },
  
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  errorText: { color: '#FECACA', fontSize: 11, marginLeft: 4 },
  dateButton: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  headerDate: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginLeft: 4 },
  
  contentContainer: { flex: 1, marginTop: -25, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: c.bg },
  
  summaryCard: { borderRadius: 16, padding: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  summaryTotal: { color: '#fff', fontSize: 28, fontWeight: '800' },
  summaryCurrency: { fontSize: 14 },
  summaryRight: { alignItems: 'flex-end' },
  progressText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  progressLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, marginTop: 12 },
  progressBarFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  pendingText: { color: '#FCD34D', fontSize: 11, marginLeft: 4 },
  
  addSection: { paddingHorizontal: 20, marginTop: 20 },
  addSectionTitle: { fontSize: 13, fontWeight: '600', color: c.textSec, marginBottom: 10 },
  addInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10 },
  addInput: { flex: 1, fontSize: 16, color: c.text, marginLeft: 10 },
  addBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  suggestionsBox: { backgroundColor: c.card, borderRadius: 12, marginTop: 8, padding: 12, borderWidth: 1, borderColor: c.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  suggestionsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  suggestionsTitle: { fontSize: 12, color: c.textSec, fontWeight: '600' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  suggestionRowDisabled: { opacity: 0.5 },
  suggestionIconBox: { width: 28, height: 28, borderRadius: 8, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  suggestionContent: { flex: 1 },
  suggestionName: { fontSize: 14, fontWeight: '500', color: c.text },
  suggestionNameDisabled: { color: c.textSec },
  suggestionMeta: { fontSize: 11, color: c.textSec, marginTop: 1 },
  suggestionUnit: { fontSize: 12, color: c.textSec, marginHorizontal: 8, backgroundColor: c.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  suggestionPrice: { fontSize: 12, color: c.primary, fontWeight: '600', marginRight: 8 },
  
  quickChipsScroll: { marginTop: 12 },
  quickChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: c.card, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: c.border },
  quickChipAdded: { borderColor: '#10B98150', backgroundColor: '#10B98110' },
  quickChipEmoji: { fontSize: 16 },
  quickChipText: { fontSize: 13, color: c.text, marginLeft: 6, marginRight: 4 },
  
  recipeCard: { marginHorizontal: 20, marginTop: 16, backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border },
  recipeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  recipeEmoji: { fontSize: 28, marginRight: 12 },
  recipeTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  recipeSubtitle: { fontSize: 12, color: c.textSec },
  recipeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recipeChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: c.border, gap: 4 },
  recipeChipAdded: { borderColor: '#10B98150', backgroundColor: '#10B98110' },
  recipeChipText: { fontSize: 12, color: c.text },
  addAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14, paddingVertical: 10, borderRadius: 10, gap: 6 },
  addAllBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: c.textSec, letterSpacing: 0.5 },
  badge: { backgroundColor: c.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: c.textSec },
  
  emptyState: { alignItems: 'center', paddingVertical: 30, backgroundColor: c.card, borderRadius: 14 },
  emptyText: { color: c.textSec, marginTop: 10, fontSize: 15, fontWeight: '500' },
  emptyHint: { color: c.textSec, marginTop: 4, fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },
  
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  itemCardPending: { borderColor: '#F59E0B40', backgroundColor: '#FEF3C710' },
  itemCheck: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  itemContent: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 16, fontWeight: '600', color: c.text },
  itemHint: { fontSize: 12, color: c.textSec, marginTop: 2 },
  itemTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  itemTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  itemTagText: { fontSize: 11, fontWeight: '600' },
  itemActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
  editActionBtn: { backgroundColor: c.primary + '15', borderWidth: 1, borderColor: c.primary + '30' },
  
  doneCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#10B98130' },
  doneContent: { flex: 1, marginLeft: 12 },
  doneName: { fontSize: 16, fontWeight: '600', color: c.text },
  doneDetails: { fontSize: 12, color: c.textSec, marginTop: 2 },
  doneTotal: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  
  ticketCard: { backgroundColor: c.card, borderRadius: 16, padding: 20 },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  ticketTitle: { fontSize: 16, fontWeight: '700', color: c.text },
  dashedLine: { height: 1, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed', marginVertical: 10 },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  ticketItemName: { fontSize: 14, color: c.text },
  ticketItemSub: { fontSize: 12, color: c.textSec },
  ticketItemPrice: { fontSize: 14, fontWeight: '600', color: c.text },
  ticketTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  ticketTotalLabel: { fontSize: 16, fontWeight: '700', color: c.text },
  ticketTotalValue: { fontSize: 22, fontWeight: '800' },
  
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: c.modal, borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  modalHeaderAdd: { borderBottomColor: '#10B98130' },
  modalHeaderEdit: { borderBottomColor: '#3B82F630' },
  modalIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalIconBig: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: c.text },
  modalSubtitle: { fontSize: 14, color: c.textSec, textAlign: 'center', marginBottom: 16 },
  modalSubtitleSmall: { fontSize: 12, color: c.textSec, marginTop: 2 },
  label: { fontSize: 12, color: c.textSec, marginBottom: 6, marginTop: 12, fontWeight: '600' },
  optional: { fontWeight: '400', fontStyle: 'italic' },
  input: { backgroundColor: c.input, padding: 14, borderRadius: 12, color: c.text, fontSize: 16, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: 'row', gap: 12 },
  productNameBox: { backgroundColor: c.input, padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border },
  productName: { fontSize: 16, fontWeight: '600', color: c.text, textAlign: 'center' },
  suggestionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, marginTop: 8, gap: 6 },
  suggestionBtnText: { fontSize: 13, fontWeight: '600' },
  totalPreview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: c.input, padding: 14, borderRadius: 12, marginTop: 12 },
  totalPreviewLabel: { fontSize: 14, color: c.textSec },
  totalPreviewValue: { fontSize: 22, fontWeight: '800' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.input, padding: 12, borderRadius: 10, marginTop: 12, gap: 8 },
  infoText: { flex: 1, fontSize: 11, color: c.textSec, lineHeight: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: c.input },
  cancelBtnText: { color: c.textSec, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  
  validateList: { backgroundColor: c.input, borderRadius: 12, marginBottom: 16 },
  validateItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 10 },
  validateItemText: { flex: 1, fontSize: 14, fontWeight: '500', color: c.text },
  
  text: { color: c.text },
  textSec: { color: c.textSec },
});