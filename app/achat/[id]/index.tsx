import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Animated, Vibration,
  Dimensions
} from 'react-native';
import { ThemedStatusBar } from '../../../src/components/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
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
  id: number;
  nomListe: string;
  dateAchat: string;
}

interface SuggestedProduct {
  nom: string;
  lastPrice: number;
  count: number;
  unite: string;
}

// =============================================
// RECETTES / THÈMES AVEC INGRÉDIENTS
// =============================================
const RECIPE_SUGGESTIONS: { [key: string]: { icon: string; name: string; items: { nom: string; unite: string }[] } } = {
  'gâteau': {
    icon: '🎂',
    name: 'Gâteau',
    items: [
      { nom: 'Farine', unite: 'kg' },
      { nom: 'Sucre', unite: 'kg' },
      { nom: 'Œufs', unite: 'pcs' },
      { nom: 'Beurre', unite: 'g' },
      { nom: 'Lait', unite: 'L' },
      { nom: 'Levure chimique', unite: 'sachet' },
      { nom: 'Vanille', unite: 'sachet' },
    ]
  },
  'gateau': {
    icon: '🎂',
    name: 'Gâteau',
    items: [
      { nom: 'Farine', unite: 'kg' },
      { nom: 'Sucre', unite: 'kg' },
      { nom: 'Œufs', unite: 'pcs' },
      { nom: 'Beurre', unite: 'g' },
      { nom: 'Lait', unite: 'L' },
      { nom: 'Levure chimique', unite: 'sachet' },
    ]
  },
  'gâteau chocolat': {
    icon: '🍫',
    name: 'Gâteau au chocolat',
    items: [
      { nom: 'Chocolat noir', unite: 'g' },
      { nom: 'Beurre', unite: 'g' },
      { nom: 'Sucre', unite: 'g' },
      { nom: 'Œufs', unite: 'pcs' },
      { nom: 'Farine', unite: 'g' },
      { nom: 'Levure chimique', unite: 'sachet' },
    ]
  },
  'crêpes': {
    icon: '🥞',
    name: 'Crêpes',
    items: [
      { nom: 'Farine', unite: 'g' },
      { nom: 'Œufs', unite: 'pcs' },
      { nom: 'Lait', unite: 'mL' },
      { nom: 'Beurre', unite: 'g' },
      { nom: 'Sucre', unite: 'g' },
    ]
  },
  'riz cantonais': {
    icon: '🍚',
    name: 'Riz cantonais',
    items: [
      { nom: 'Riz', unite: 'g' },
      { nom: 'Œufs', unite: 'pcs' },
      { nom: 'Jambon', unite: 'g' },
      { nom: 'Petits pois', unite: 'g' },
      { nom: 'Carottes', unite: 'pcs' },
      { nom: 'Oignon', unite: 'pcs' },
      { nom: 'Sauce soja', unite: 'mL' },
      { nom: 'Huile', unite: 'mL' },
    ]
  },
  'pizza': {
    icon: '🍕',
    name: 'Pizza',
    items: [
      { nom: 'Farine', unite: 'g' },
      { nom: 'Levure', unite: 'sachet' },
      { nom: 'Sauce tomate', unite: 'boîte' },
      { nom: 'Mozzarella', unite: 'g' },
      { nom: 'Jambon', unite: 'g' },
      { nom: 'Champignons', unite: 'g' },
      { nom: 'Olives', unite: 'g' },
    ]
  },
  'pâtes carbonara': {
    icon: '🍝',
    name: 'Pâtes carbonara',
    items: [
      { nom: 'Pâtes spaghetti', unite: 'g' },
      { nom: 'Lardons', unite: 'g' },
      { nom: 'Œufs', unite: 'pcs' },
      { nom: 'Parmesan', unite: 'g' },
      { nom: 'Crème fraîche', unite: 'mL' },
    ]
  },
  'pâtes bolognaise': {
    icon: '🍝',
    name: 'Pâtes bolognaise',
    items: [
      { nom: 'Pâtes', unite: 'g' },
      { nom: 'Viande hachée', unite: 'g' },
      { nom: 'Sauce tomate', unite: 'boîte' },
      { nom: 'Oignon', unite: 'pcs' },
      { nom: 'Ail', unite: 'gousse' },
      { nom: 'Parmesan', unite: 'g' },
    ]
  },
  'lasagnes': {
    icon: '🍝',
    name: 'Lasagnes',
    items: [
      { nom: 'Feuilles de lasagne', unite: 'paquet' },
      { nom: 'Viande hachée', unite: 'g' },
      { nom: 'Sauce tomate', unite: 'boîte' },
      { nom: 'Béchamel', unite: 'mL' },
      { nom: 'Fromage râpé', unite: 'g' },
    ]
  },
  'poulet rôti': {
    icon: '🍗',
    name: 'Poulet rôti',
    items: [
      { nom: 'Poulet entier', unite: 'pcs' },
      { nom: 'Pommes de terre', unite: 'kg' },
      { nom: 'Oignon', unite: 'pcs' },
      { nom: 'Ail', unite: 'têtes' },
      { nom: 'Huile d\'olive', unite: 'mL' },
      { nom: 'Thym', unite: 'branches' },
    ]
  },
  'salade': {
    icon: '🥗',
    name: 'Salade',
    items: [
      { nom: 'Laitue', unite: 'pcs' },
      { nom: 'Tomates', unite: 'pcs' },
      { nom: 'Concombre', unite: 'pcs' },
      { nom: 'Huile d\'olive', unite: 'mL' },
      { nom: 'Vinaigre', unite: 'mL' },
    ]
  },
  'soupe': {
    icon: '🍲',
    name: 'Soupe de légumes',
    items: [
      { nom: 'Carottes', unite: 'pcs' },
      { nom: 'Pommes de terre', unite: 'pcs' },
      { nom: 'Poireaux', unite: 'pcs' },
      { nom: 'Oignon', unite: 'pcs' },
      { nom: 'Bouillon cube', unite: 'pcs' },
    ]
  },
  'barbecue': {
    icon: '🍖',
    name: 'Barbecue',
    items: [
      { nom: 'Saucisses', unite: 'pcs' },
      { nom: 'Merguez', unite: 'pcs' },
      { nom: 'Côtes de porc', unite: 'kg' },
      { nom: 'Charbon de bois', unite: 'sac' },
      { nom: 'Sauce barbecue', unite: 'bouteille' },
    ]
  },
  'couscous': {
    icon: '🍲',
    name: 'Couscous',
    items: [
      { nom: 'Semoule couscous', unite: 'g' },
      { nom: 'Poulet', unite: 'kg' },
      { nom: 'Merguez', unite: 'pcs' },
      { nom: 'Carottes', unite: 'pcs' },
      { nom: 'Courgettes', unite: 'pcs' },
      { nom: 'Pois chiches', unite: 'boîte' },
      { nom: 'Harissa', unite: 'tube' },
    ]
  },
  'burger': {
    icon: '🍔',
    name: 'Burger maison',
    items: [
      { nom: 'Pain burger', unite: 'pcs' },
      { nom: 'Steak haché', unite: 'pcs' },
      { nom: 'Cheddar', unite: 'tranches' },
      { nom: 'Salade', unite: 'feuilles' },
      { nom: 'Tomate', unite: 'pcs' },
      { nom: 'Ketchup', unite: 'bouteille' },
    ]
  },
  'sushi': {
    icon: '🍣',
    name: 'Sushi',
    items: [
      { nom: 'Riz à sushi', unite: 'g' },
      { nom: 'Saumon frais', unite: 'g' },
      { nom: 'Algues nori', unite: 'feuilles' },
      { nom: 'Vinaigre de riz', unite: 'mL' },
      { nom: 'Sauce soja', unite: 'bouteille' },
      { nom: 'Wasabi', unite: 'tube' },
    ]
  },
  'smoothie': {
    icon: '🥤',
    name: 'Smoothie',
    items: [
      { nom: 'Bananes', unite: 'pcs' },
      { nom: 'Fraises', unite: 'g' },
      { nom: 'Yaourt', unite: 'pot' },
      { nom: 'Lait', unite: 'mL' },
      { nom: 'Miel', unite: 'cuillère' },
    ]
  },
  'petit-déjeuner': {
    icon: '🍳',
    name: 'Petit-déjeuner',
    items: [
      { nom: 'Pain', unite: 'pcs' },
      { nom: 'Beurre', unite: 'g' },
      { nom: 'Confiture', unite: 'pot' },
      { nom: 'Œufs', unite: 'pcs' },
      { nom: 'Lait', unite: 'L' },
      { nom: 'Jus d\'orange', unite: 'L' },
      { nom: 'Café', unite: 'paquet' },
    ]
  },
  'brunch': {
    icon: '🥐',
    name: 'Brunch',
    items: [
      { nom: 'Croissants', unite: 'pcs' },
      { nom: 'Pain de mie', unite: 'paquet' },
      { nom: 'Œufs', unite: 'pcs' },
      { nom: 'Bacon', unite: 'paquet' },
      { nom: 'Avocat', unite: 'pcs' },
      { nom: 'Saumon fumé', unite: 'paquet' },
    ]
  },
  'anniversaire': {
    icon: '🎉',
    name: 'Anniversaire',
    items: [
      { nom: 'Gâteau d\'anniversaire', unite: 'pcs' },
      { nom: 'Bougies', unite: 'paquet' },
      { nom: 'Bonbons', unite: 'sachets' },
      { nom: 'Chips', unite: 'paquets' },
      { nom: 'Boissons gazeuses', unite: 'L' },
      { nom: 'Ballons', unite: 'paquet' },
    ]
  },
  'pique-nique': {
    icon: '🧺',
    name: 'Pique-nique',
    items: [
      { nom: 'Sandwichs', unite: 'pcs' },
      { nom: 'Fruits', unite: 'kg' },
      { nom: 'Chips', unite: 'paquet' },
      { nom: 'Fromage', unite: 'g' },
      { nom: 'Pain', unite: 'pcs' },
      { nom: 'Eau', unite: 'L' },
    ]
  },
  'apéro': {
    icon: '🥂',
    name: 'Apéritif',
    items: [
      { nom: 'Chips', unite: 'paquets' },
      { nom: 'Cacahuètes', unite: 'sachet' },
      { nom: 'Olives', unite: 'pot' },
      { nom: 'Saucisson', unite: 'pcs' },
      { nom: 'Fromage', unite: 'g' },
      { nom: 'Vin', unite: 'bouteilles' },
    ]
  },
  'goûter': {
    icon: '🍪',
    name: 'Goûter',
    items: [
      { nom: 'Biscuits', unite: 'paquet' },
      { nom: 'Chocolat', unite: 'tablette' },
      { nom: 'Compotes', unite: 'pcs' },
      { nom: 'Jus de fruits', unite: 'L' },
    ]
  },
  'gouter': {
    icon: '🍪',
    name: 'Goûter',
    items: [
      { nom: 'Biscuits', unite: 'paquet' },
      { nom: 'Chocolat', unite: 'tablette' },
      { nom: 'Compotes', unite: 'pcs' },
      { nom: 'Jus de fruits', unite: 'L' },
    ]
  },
};

const QUICK_PRODUCTS = [
  { nom: 'Riz', icon: '🍚', unite: 'kg' },
  { nom: 'Pain', icon: '🍞', unite: 'pcs' },
  { nom: 'Lait', icon: '🥛', unite: 'L' },
  { nom: 'Œufs', icon: '🥚', unite: 'pcs' },
  { nom: 'Huile', icon: '🫒', unite: 'L' },
  { nom: 'Sucre', icon: '🍬', unite: 'kg' },
  { nom: 'Légumes', icon: '🥬', unite: 'kg' },
  { nom: 'Viande', icon: '🥩', unite: 'kg' },
];

export default function AchatDetails() {
  const { activeTheme, getStyles, isDarkMode } = useTheme();
  const { currency, language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(styles);
  
  const params = useLocalSearchParams<{ id?: string, readOnly?: string }>();
  const achatId = Number(params.id);
  const isReadOnly = params.readOnly === '1';

  const scrollViewRef = useRef<ScrollView>(null);
  const titleInputRef = useRef<TextInput>(null);
  const addInputRef = useRef<TextInput>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const [achat, setAchat] = useState<Achat | null>(null);
  const [lignes, setLignes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [newItem, setNewItem] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [historySuggestions, setHistorySuggestions] = useState<SuggestedProduct[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<SuggestedProduct[]>([]);
  const [recipeSuggestion, setRecipeSuggestion] = useState<{ icon: string; name: string; items: { nom: string; unite: string }[] } | null>(null);
  const [showRecipeSuggestion, setShowRecipeSuggestion] = useState(true);
  
  // Modals
  const [editModal, setEditModal] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [editData, setEditData] = useState({ nom: '', qty: '', prix: '', unite: 'pcs' });
  
  const [buyModal, setBuyModal] = useState(false);
  const [buyIdx, setBuyIdx] = useState(-1);
  const [buyData, setBuyData] = useState({ nom: '', qty: '1', prix: '', unite: 'pcs', suggestedPrice: 0 });

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

  useEffect(() => {
    if (!achatId) return;
    loadData();
    loadHistorySuggestions();
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

  // Filter suggestions when typing - STABLE (no flickering)
  useEffect(() => {
    if (newItem.trim().length >= 2) {
      const searchTerm = newItem.toLowerCase().trim();
      const filtered = historySuggestions
        .filter(s => s.nom.toLowerCase().includes(searchTerm))
        .slice(0, 5);
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [newItem, historySuggestions]);

  const loadData = () => {
    try {
      const db = getDb();
      const result = db.getAllSync('SELECT * FROM Achat WHERE id = ?', [achatId]);
      const a = result[0] as Achat;
      if (!a) return;
      setAchat(a);
      setTitle(a.nomListe);
      const items = db.getAllSync('SELECT * FROM LigneAchat WHERE idAchat = ? ORDER BY id ASC', [achatId]);
      setLignes(items.map((l: any) => ({ 
        ...l, 
        checked: l.prixUnitaire > 0,
        hasQtyOnly: l.quantite > 0 && l.prixUnitaire === 0
      })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const loadHistorySuggestions = () => {
    try {
      const db = getDb();
      const result = db.getAllSync(`
        SELECT libelleProduit as nom, prixUnitaire as lastPrice, unite, COUNT(*) as count 
        FROM LigneAchat 
        WHERE prixUnitaire > 0 
        GROUP BY LOWER(libelleProduit) 
        ORDER BY count DESC 
        LIMIT 50
      `);
      setHistorySuggestions(result as SuggestedProduct[]);
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
    if (!title.trim()) {
      setTitleError(language === 'en' ? 'List name is required' : 'Le nom de la liste est obligatoire');
      shakeTitle();
      triggerHaptic('medium');
      titleInputRef.current?.focus();
      return false;
    }
    setTitleError('');
    return true;
  };

  const saveTitle = () => {
    if (isReadOnly) return;
    if (!validateTitle() || !achat) return;
    getDb().runSync('UPDATE Achat SET nomListe = ? WHERE id = ?', [title.trim(), achatId]);
    setAchat({ ...achat, nomListe: title.trim() });
  };

  const handleTitleChange = (text: string) => {
    setTitle(text);
    if (text.trim()) setTitleError('');
  };

  // Add single item
  const addItem = (productName: string, unite?: string) => {
    if (isReadOnly) return;
    if (!validateTitle()) return;
    
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
      const r = db.runSync(
        'INSERT INTO LigneAchat (idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, 0, 0, 0, ?)', 
        [achatId, nom, unite || 'pcs']
      );
      const newLine = { 
        id: r.lastInsertRowId, 
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
      setFilteredSuggestions([]);
    } catch(e) { console.error(e); }
  };

  const addFromRecipeSuggestion = (item: { nom: string; unite: string }) => {
    addItem(item.nom, item.unite);
  };

  const addAllRecipeIngredients = () => {
    if (!recipeSuggestion) return;
    if (!validateTitle()) return;
    
    let addedCount = 0;
    const db = getDb();
    
    recipeSuggestion.items.forEach(item => {
      const exists = lignes.some(l => l.libelleProduit.toLowerCase() === item.nom.toLowerCase());
      if (!exists) {
        try {
          const r = db.runSync(
            'INSERT INTO LigneAchat (idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, 0, 0, 0, ?)', 
            [achatId, item.nom, item.unite]
          );
          const newLine = { 
            id: r.lastInsertRowId, 
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

  const addFromHistorySuggestion = (s: SuggestedProduct) => {
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

  const openBuyForItem = (item: any) => {
    if (isReadOnly) return;
    const idx = lignes.findIndex(l => l.id === item.id);
    if (idx === -1) return;
    const l = lignes[idx];
    const suggestion = historySuggestions.find(s => s.nom.toLowerCase() === l.libelleProduit.toLowerCase());
    setBuyIdx(idx);
    setBuyData({
      nom: l.libelleProduit,
      qty: l.quantite > 0 ? String(l.quantite) : '1',
      prix: l.prixUnitaire > 0 ? String(l.prixUnitaire) : '',
      unite: l.unite || 'pcs',
      suggestedPrice: suggestion?.lastPrice || 0,
    });
    setBuyModal(true);
    triggerHaptic('light');
  };

  const openEditForItem = (item: any) => {
    if (isReadOnly) return;
    const idx = lignes.findIndex(l => l.id === item.id);
    if (idx === -1) return;
    const l = lignes[idx];
    setEditIdx(idx);
    setEditData({ 
      nom: l.libelleProduit, 
      qty: l.quantite > 0 ? String(l.quantite) : '', 
      prix: l.prixUnitaire > 0 ? String(l.prixUnitaire) : '',
      unite: l.unite || 'pcs' 
    });
    setEditModal(true);
    triggerHaptic('light');
  };

  const uncheckItem = (item: any) => {
    if (isReadOnly) return;
    const idx = lignes.findIndex(l => l.id === item.id);
    if (idx === -1) return;
    triggerHaptic('light');
    const l = lignes[idx];
    getDb().runSync('UPDATE LigneAchat SET prixUnitaire=0, prixTotal=0 WHERE id=?', [l.id]);
    const updatedLignes = [...lignes];
    updatedLignes[idx] = { ...l, prixUnitaire: 0, prixTotal: 0, checked: false, hasQtyOnly: l.quantite > 0 };
    setLignes(updatedLignes);
  };

  const saveEdit = () => {
    const qty = Number.parseFloat(editData.qty) || 0;
    const prix = Number.parseFloat(editData.prix) || 0;
    const nom = editData.nom.trim();
    const unite = editData.unite.trim() || 'pcs';
    
    if (!nom) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Erreur',
        language === 'en' ? 'Product name is required' : 'Le nom du produit est obligatoire'
      );
      return;
    }
    
    const total = qty * prix;
    const l = lignes[editIdx];
    getDb().runSync(
      'UPDATE LigneAchat SET libelleProduit=?, quantite=?, prixUnitaire=?, prixTotal=?, unite=? WHERE id=?', 
      [nom, qty, prix, total, unite, l.id]
    );
      
    const updatedLignes = [...lignes];
    updatedLignes[editIdx] = { 
      ...l, 
      libelleProduit: nom, 
      quantite: qty, 
      prixUnitaire: prix,
      prixTotal: total,
      unite: unite,
      checked: prix > 0,
      hasQtyOnly: qty > 0 && prix === 0
    };
    setLignes(updatedLignes);
    setEditModal(false);
    triggerHaptic('light');
  };

  const saveBuy = () => {
    const qty = Number.parseFloat(buyData.qty) || 0;
    const prix = Number.parseFloat(buyData.prix) || 0;
    const unite = buyData.unite.trim() || 'pcs';
    const total = qty * prix;
    const l = lignes[buyIdx];
    
    if (qty <= 0) {
      Alert.alert(
        language === 'en' ? 'Error' : 'Erreur', 
        language === 'en' ? 'Please enter a quantity' : 'Veuillez renseigner la quantité'
      );
      return;
    }
    
    getDb().runSync(
      'UPDATE LigneAchat SET quantite=?, prixUnitaire=?, prixTotal=?, unite=? WHERE id=?', 
      [qty, prix, total, unite, l.id]
    );
    const updatedLignes = [...lignes];
    updatedLignes[buyIdx] = { 
      ...l, 
      quantite: qty, 
      prixUnitaire: prix, 
      prixTotal: total, 
      unite: unite, 
      checked: prix > 0,
      hasQtyOnly: qty > 0 && prix === 0
    };
    setLignes(updatedLignes);
    setBuyModal(false);
    
    if (prix > 0) {
      playSuccessAnimation();
    } else {
      triggerHaptic('light');
    }
  };

  const askDelete = (item: any) => {
    if (isReadOnly) return;
    triggerHaptic('medium');
    setItemToDelete(item);
    setDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    getDb().runSync('DELETE FROM LigneAchat WHERE id=?', [itemToDelete.id]);
    setLignes(lignes.filter(l => l.id !== itemToDelete.id));
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
          : `${itemsNotProcessed.length} article(s) non traités`
      );
      return;
    }
    
    if (itemsNeedPrice.length > 0) {
      setItemsWithoutPrice(itemsNeedPrice);
      setValidateModal(true);
      return;
    }
    
    if (!validateTitle()) return;
    
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
      getDb().runSync('UPDATE Achat SET dateAchat=? WHERE id=?', [iso, achatId]);
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
                <Text style={s.headerTitle}>{title}</Text>
                <Text style={s.headerDate}>
                  {format(new Date(achat.dateAchat), 'EEEE dd MMMM yyyy', { locale: language === 'en' ? enUS : fr })}
                </Text>
              </View>
            ) : (
              <View>
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                  <TextInput
                    ref={titleInputRef}
                    style={[s.titleInput, titleError && s.titleInputError]}
                    value={title}
                    onChangeText={handleTitleChange}
                    onBlur={saveTitle}
                    placeholder={language === 'en' ? 'List name *' : 'Nom de la liste *'}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />
                  {titleError ? (
                    <View style={s.errorContainer}>
                      <Ionicons name="alert-circle" size={12} color="#FECACA" />
                      <Text style={s.errorText}>{titleError}</Text>
                    </View>
                  ) : null}
                </Animated.View>
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
              {lignes.map((item, i) => (
                <View key={i} style={s.ticketRow}>
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
                      <Text style={s.summaryLabel}>{language === 'en' ? 'TOTAL' : 'TOTAL'}</Text>
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

              {/* ADD ITEM INPUT - EN HAUT */}
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
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setTimeout(() => setIsInputFocused(false), 150)}
                    returnKeyType="done"
                  />
                  {newItem.trim() && (
                    <TouchableOpacity onPress={handleSubmitItem} style={[s.addBtn, { backgroundColor: activeTheme.primary }]}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* History Suggestions Dropdown */}
                {isInputFocused && filteredSuggestions.length > 0 && (
                  <View style={s.suggestionsBox}>
                    <Text style={s.suggestionsTitle}>{language === 'en' ? 'History' : 'Historique'}</Text>
                    {filteredSuggestions.map((sug, i) => (
                      <TouchableOpacity 
                        key={i} 
                        style={s.suggestionRow}
                        onPress={() => addFromHistorySuggestion(sug)}
                      >
                        <Ionicons name="time-outline" size={16} color={s.textSec.color} />
                        <Text style={s.suggestionName}>{sug.nom}</Text>
                        <Text style={s.suggestionUnit}>{sug.unite}</Text>
                        <Text style={s.suggestionPrice}>{formatMoney(sug.lastPrice)} {currency}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* Quick chips */}
                {!isInputFocused && !recipeSuggestion && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.quickChipsScroll}>
                    {QUICK_PRODUCTS.map((p, i) => {
                      const added = lignes.some(l => l.libelleProduit.toLowerCase() === p.nom.toLowerCase());
                      return (
                        <TouchableOpacity 
                          key={i} 
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
                    {recipeSuggestion.items.map((item, i) => {
                      const added = lignes.some(l => l.libelleProduit.toLowerCase() === item.nom.toLowerCase());
                      return (
                        <TouchableOpacity 
                          key={i}
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
                  </View>
                )}

                {unchecked.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[s.itemCard, item.hasQtyOnly && s.itemCardPending]}
                    onPress={() => openBuyForItem(item)}
                  >
                    <View style={[s.itemCheck, { borderColor: item.hasQtyOnly ? '#F59E0B' : activeTheme.primary }]}>
                      {item.hasQtyOnly ? (
                        <Ionicons name="time" size={14} color="#F59E0B" />
                      ) : (
                        <Ionicons name="add" size={12} color={activeTheme.primary} style={{ opacity: 0.4 }} />
                      )}
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
                      <TouchableOpacity onPress={(e) => { e.stopPropagation(); openEditForItem(item); }} style={s.actionBtn}>
                        <Ionicons name="pencil" size={16} color={activeTheme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={(e) => { e.stopPropagation(); askDelete(item); }} style={[s.actionBtn, { backgroundColor: '#FEE2E2' }]}>
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
                  
                  {checked.map((item) => (
                    <View key={item.id} style={s.doneCard}>
                      <TouchableOpacity onPress={() => uncheckItem(item)}>
                        <Ionicons name="checkmark-circle" size={26} color="#10B981" />
                      </TouchableOpacity>
                      
                      <View style={s.doneContent}>
                        <Text style={s.doneName}>{item.libelleProduit}</Text>
                        <Text style={s.doneDetails}>{item.quantite} {item.unite} × {formatMoney(item.prixUnitaire)} {currency}</Text>
                        <Text style={[s.doneTotal, { color: activeTheme.primary }]}>{formatMoney(item.prixTotal)} {currency}</Text>
                      </View>
                      
                      <View style={s.itemActions}>
                        <TouchableOpacity onPress={() => openEditForItem(item)} style={s.actionBtn}>
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

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={s.backdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalBox}>
            <View style={s.modalHeader}>
              <Ionicons name="create" size={24} color={activeTheme.primary} />
              <Text style={s.modalTitle}>{language === 'en' ? 'Edit' : 'Modifier'}</Text>
            </View>
            
            <Text style={s.label}>{language === 'en' ? 'Name' : 'Nom'} *</Text>
            <TextInput style={s.input} value={editData.nom} onChangeText={t => setEditData({...editData, nom: t})} autoFocus />
            
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{language === 'en' ? 'Quantity' : 'Quantité'}</Text>
                <TextInput style={s.input} keyboardType="numeric" value={editData.qty} onChangeText={t => setEditData({...editData, qty: t})} placeholder="0" placeholderTextColor={s.textSec.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{language === 'en' ? 'Unit' : 'Unité'}</Text>
                <TextInput style={s.input} value={editData.unite} onChangeText={t => setEditData({...editData, unite: t})} placeholder="pcs" placeholderTextColor={s.textSec.color} />
              </View>
            </View>
            
            <Text style={s.label}>{language === 'en' ? 'Price' : 'Prix'} ({currency}) <Text style={s.optional}>({language === 'en' ? 'optional' : 'optionnel'})</Text></Text>
            <TextInput style={s.input} keyboardType="numeric" value={editData.prix} onChangeText={t => setEditData({...editData, prix: t})} placeholder="0" placeholderTextColor={s.textSec.color} />

            <View style={s.modalActions}>
              <TouchableOpacity onPress={() => setEditModal(false)} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>{language === 'en' ? 'Cancel' : 'Annuler'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[s.saveBtn, { backgroundColor: activeTheme.primary }]}>
                <Text style={s.saveBtnText}>{language === 'en' ? 'Save' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Buy Modal */}
      <Modal visible={buyModal} transparent animationType="fade">
        <View style={s.backdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalBox}>
            <View style={s.modalHeader}>
              <Ionicons name="checkbox" size={24} color={activeTheme.primary} />
              <Text style={s.modalTitle}>{language === 'en' ? 'Item Details' : 'Détails'}</Text>
            </View>
            
            <View style={s.productNameBox}>
              <Text style={s.productName}>{buyData.nom}</Text>
            </View>
            
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{language === 'en' ? 'Quantity' : 'Quantité'} *</Text>
                <TextInput style={s.input} keyboardType="numeric" value={buyData.qty} onChangeText={t => setBuyData({...buyData, qty: t})} autoFocus />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{language === 'en' ? 'Unit' : 'Unité'}</Text>
                <TextInput style={s.input} value={buyData.unite} onChangeText={t => setBuyData({...buyData, unite: t})} placeholder="pcs" placeholderTextColor={s.textSec.color} />
              </View>
            </View>
            
            <Text style={s.label}>{language === 'en' ? 'Unit Price' : 'Prix unitaire'} ({currency}) <Text style={s.optional}>({language === 'en' ? 'optional' : 'optionnel'})</Text></Text>
            <TextInput 
              style={s.input} 
              keyboardType="numeric" 
              value={buyData.prix} 
              onChangeText={t => setBuyData({...buyData, prix: t})} 
              placeholder={buyData.suggestedPrice ? `${language === 'en' ? 'Suggested' : 'Suggéré'}: ${formatMoney(buyData.suggestedPrice)}` : '0'} 
              placeholderTextColor={s.textSec.color} 
            />
            
            {buyData.suggestedPrice > 0 && !buyData.prix && (
              <TouchableOpacity 
                onPress={() => setBuyData({...buyData, prix: String(buyData.suggestedPrice)})}
                style={[s.suggestionBtn, { backgroundColor: activeTheme.primary + '15' }]}
              >
                <Ionicons name="flash" size={16} color={activeTheme.primary} />
                <Text style={[s.suggestionBtnText, { color: activeTheme.primary }]}>
                  {language === 'en' ? 'Use' : 'Utiliser'}: {formatMoney(buyData.suggestedPrice)} {currency}
                </Text>
              </TouchableOpacity>
            )}
            
            {buyData.prix && Number(buyData.prix) > 0 && (
              <View style={s.totalPreview}>
                <Text style={s.totalPreviewLabel}>Total</Text>
                <Text style={[s.totalPreviewValue, { color: activeTheme.primary }]}>
                  {formatMoney((Number(buyData.qty) || 0) * (Number(buyData.prix) || 0))} {currency}
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
              <TouchableOpacity onPress={() => setBuyModal(false)} style={s.cancelBtn}>
                <Text style={s.cancelBtnText}>{language === 'en' ? 'Cancel' : 'Annuler'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBuy} style={[s.saveBtn, { backgroundColor: activeTheme.primary }]}>
                <Text style={s.saveBtnText}>{language === 'en' ? 'Save' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
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
              {itemsWithoutPrice.map((item, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={s.validateItem}
                  onPress={() => { setValidateModal(false); setTimeout(() => openBuyForItem(item), 200); }}
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
  titleInput: { fontSize: 20, fontWeight: 'bold', color: '#fff', borderBottomWidth: 2, borderBottomColor: 'rgba(255,255,255,0.3)', paddingVertical: 4 },
  titleInputError: { borderBottomColor: '#FECACA' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  errorText: { color: '#FECACA', fontSize: 11, marginLeft: 4 },
  dateButton: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  headerDate: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginLeft: 4 },
  
  contentContainer: { flex: 1, marginTop: -25, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: c.bg },
  
  // Summary
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
  
  // Add Section
  addSection: { paddingHorizontal: 20, marginTop: 20 },
  addSectionTitle: { fontSize: 13, fontWeight: '600', color: c.textSec, marginBottom: 10 },
  addInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10 },
  addInput: { flex: 1, fontSize: 16, color: c.text, marginLeft: 10 },
  addBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  // Suggestions
  suggestionsBox: { backgroundColor: c.card, borderRadius: 12, marginTop: 8, padding: 12, borderWidth: 1, borderColor: c.border },
  suggestionsTitle: { fontSize: 11, color: c.textSec, marginBottom: 8, fontWeight: '600' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  suggestionName: { flex: 1, fontSize: 14, color: c.text, marginLeft: 8 },
  suggestionUnit: { fontSize: 12, color: c.textSec, marginRight: 10 },
  suggestionPrice: { fontSize: 12, color: c.primary, fontWeight: '600' },
  
  // Quick chips
  quickChipsScroll: { marginTop: 12 },
  quickChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: c.card, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: c.border },
  quickChipAdded: { borderColor: '#10B98150', backgroundColor: '#10B98110' },
  quickChipEmoji: { fontSize: 16 },
  quickChipText: { fontSize: 13, color: c.text, marginLeft: 6, marginRight: 4 },
  
  // Recipe card
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
  
  // Section
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: c.textSec, letterSpacing: 0.5 },
  badge: { backgroundColor: c.border, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  badgeText: { fontSize: 11, fontWeight: '700', color: c.textSec },
  
  emptyState: { alignItems: 'center', paddingVertical: 30, backgroundColor: c.card, borderRadius: 14 },
  emptyText: { color: c.textSec, marginTop: 10 },
  
  // Item card
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: c.border },
  itemCardPending: { borderColor: '#F59E0B40' },
  itemCheck: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, justifyContent: 'center',alignItems: 'center' },
  itemContent: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 16, fontWeight: '600', color: c.text },
  itemHint: { fontSize: 12, color: c.textSec, marginTop: 2 },
  itemTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  itemTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  itemTagText: { fontSize: 11, fontWeight: '600' },
  itemActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
  
  // Done card
  doneCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#10B98130' },
  doneContent: { flex: 1, marginLeft: 12 },
  doneName: { fontSize: 16, fontWeight: '600', color: c.text },
  doneDetails: { fontSize: 12, color: c.textSec, marginTop: 2 },
  doneTotal: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  
  // Ticket (read only)
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
  
  // Modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: c.modal, borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  modalIconBig: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: c.text },
  modalSubtitle: { fontSize: 14, color: c.textSec, textAlign: 'center', marginBottom: 16 },
  label: { fontSize: 12, color: c.textSec, marginBottom: 6, marginTop: 12, fontWeight: '600' },
  optional: { fontWeight: '400', fontStyle: 'italic' },
  input: { backgroundColor: c.input, padding: 14, borderRadius: 12, color: c.text, fontSize: 16, borderWidth: 1, borderColor: c.border },
  row: { flexDirection: 'row', gap: 12 },
  productNameBox: { backgroundColor: c.input, padding: 14, borderRadius: 12, marginBottom: 8 },
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
  
  // Validate modal
  validateList: { backgroundColor: c.input, borderRadius: 12, marginBottom: 16 },
  validateItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: c.border, gap: 10 },
  validateItemText: { flex: 1, fontSize: 14, fontWeight: '500', color: c.text },
  
  // Helpers
  text: { color: c.text },
  textSec: { color: c.textSec },
});