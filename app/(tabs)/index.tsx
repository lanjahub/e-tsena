import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  TextInput, Modal, Switch, Dimensions, Animated, Easing, Alert
} from 'react-native';
import { ThemedStatusBar } from '../../src/components/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import formatMoney from '../../src/utils/formatMoney';
import { fr, enUS } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';

import { getDb } from '../../src/db/init';
import { Logo } from '../../src/components/Logo';
import { useTheme, THEMES } from '../../src/context/ThemeContext'; 
import { useSettings } from '../../src/context/SettingsContext'; 
import * as NotifService from '../../src/services/notificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- DICTIONNAIRE DE TRADUCTION ---
const TRADUCTIONS: any = {
  fr: {
    ongoing: 'En cours',
    history: 'Historique',
    list_ongoing_title: 'Listes à faire',
    list_history_title: 'Courses terminées',
    mark_done: 'Marquer comme terminé',
    reopen_list: 'Rouvrir la liste',
    rename: 'Renommer',
    delete: 'Supprimer',
    delete_list: 'Supprimer la liste',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    empty_ongoing: 'Aucune liste en cours',
    empty_history: 'Aucun historique',
    search: 'Rechercher...',
    check_prices_title: 'Vérification',
    check_prices_msg: 'Avez-vous bien vérifié les prix réels avant de terminer ?',
    delete_title: 'Supprimer la liste ?',
    delete_msg: 'Cette action est irréversible.',
    delete_list_confirm: 'Voulez-vous vraiment supprimer',
    expenses: 'Dépenses',
    articles: 'Articles',
    welcome: 'Accueil',
    reports: 'Rapports',
    settings: 'Paramètres',
    choose_theme: 'Choisir un thème',
    dark_mode: 'Mode sombre',
    language: 'Langue',
    help: 'Aide & Astuces',
    sort_by: 'Trier par',
    sort_date: 'Date',
    sort_amount: 'Montant',
    tips_title: 'Astuces',
    tips_content: ["Une fois dans l'historique, la liste ne peut plus être modifiée.", "Supprimez les anciennes listes pour garder l'application rapide."],
    understood: 'Compris',
    list_archived: "Liste déplacée dans l'historique",
    list_active: "Liste remise dans les cours en cours",
    done: "Terminé",
    reopened: "Rouvert"
  },
  mg: {
    ongoing: 'Mbola atao',
    history: 'Efa vita',
    list_ongoing_title: 'Lisitra mbola ho vidiana',
    list_history_title: 'Lisitra efa vita',
    mark_done: 'Marihina fa vita',
    reopen_list: 'Averina sokafana',
    rename: 'Hanova anarana',
    delete: 'Hamafa',
    delete_list: 'Hamafa ny liste',
    cancel: 'Foanana',
    confirm: 'Hamafisina',
    save: 'Tehirizina',
    empty_ongoing: 'Tsy misy lisitra an-dalam-panaovana',
    empty_history: 'Tsy misy tantara voatahiry',
    search: 'Karoka...',
    check_prices_title: 'Fanamarinana',
    check_prices_msg: 'Voamarinao ve fa tena ireo ny vidiny nividianana tany an-tsena?',
    delete_title: 'Hamafa ity lisitra ity?',
    delete_msg: 'Tsy ho hita intsony ity rehefa voafafa.',
    delete_list_confirm: "Te hamafa an'i",
    expenses: 'Fandaniana',
    articles: 'Entana',
    welcome: 'Fandraisana',
    reports: 'Tatitra',
    settings: 'Fikirakirana',
    choose_theme: 'Safidio ny loko',
    dark_mode: 'Mode mainty',
    language: 'Fiteny',
    help: 'Fanampiana',
    sort_by: 'Alahatra araka',
    sort_date: 'Daty',
    sort_amount: 'Vola',
    tips_title: 'Torohevitra',
    tips_content: ["Rehefa tafiditra ao amin'ny 'Efa vita' ny lisitra dia tsy azo ovaina intsony.", "Fafao ny lisitra tranainy mba hampilamina ny finday."],
    understood: 'Mazava',
    list_archived: "Nafindra any amin'ny Historique",
    list_active: "Naverina amin'ny En cours",
    done: "Vita",
    reopened: "Niverina"
  }
};

// --- COMPOSANT: CONFIRMATION MODAL DESIGN ---
const BeautifulConfirmModal = ({ visible, title, message, onConfirm, onCancel, confirmText, cancelText, activeTheme, type = 'danger' }: any) => {
    if (!visible) return null;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true })
            ]).start();
        }
    }, [visible]);

    const isDanger = type === 'danger';
    const mainColor = isDanger ? '#EF4444' : activeTheme.primary;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
            <View style={styles(activeTheme).modalOverlay}>
                <Animated.View style={[styles(activeTheme).modalContent, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
                    <View style={[styles(activeTheme).iconWrapper, { backgroundColor: isDanger ? '#FEE2E2' : activeTheme.secondary }]}>
                        <Ionicons name={isDanger ? "trash-outline" : "alert-circle-outline"} size={32} color={mainColor} />
                    </View>
                    <Text style={styles(activeTheme).modalTitleText}>{title}</Text>
                    <Text style={styles(activeTheme).modalMessageText}>{message}</Text>
                    <View style={styles(activeTheme).modalBtnRow}>
                        <TouchableOpacity onPress={onCancel} style={styles(activeTheme).modalBtnCancel}>
                            <Text style={styles(activeTheme).modalBtnCancelText}>{cancelText}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onConfirm} style={[styles(activeTheme).modalBtnConfirm, { backgroundColor: mainColor }]}>
                            <Text style={styles(activeTheme).modalBtnConfirmText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

// --- HEADER ANIMÉ ---
const BazarHeader = () => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (anim: Animated.Value, duration: number, delay: number = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: duration, delay, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(anim, { toValue: 0, duration: duration, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
        ])
      );
    };
    Animated.parallel([ createLoop(anim1, 4000), createLoop(anim2, 6000) ]).start();
  }, []);

  const translateY1 = anim1.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const rotate1 = anim1.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(255,255,255,0.05)', transform: [{ translateY: translateY1 }] }} />
      <View style={{ position: 'absolute', top: 10, right: 10, width: 180, height: 180 }}>
         <Animated.View style={{ position: 'absolute', top: 0, right: 0, opacity: 0.15, transform: [{ translateY: translateY1 }, { rotate: rotate1 }] }}><Ionicons name="cart" size={160} color="#fff" /></Animated.View>
      </View>
    </View>
  );
};

interface Achat {
  id: number;
  nomListe: string;
  dateAchat: string;
  totalDepense: number;
  nombreArticles: number;
  statut: number; 
}

// --- ITEM COMPONENT (UNIFIÉ & CORRIGÉ) ---
const AchatItem = ({ item, viewMode, s, activeTheme, language, currency, onPress, onAction }: any) => {
  const isDone = item.statut === 1; // 0 = En cours, 1 = Historique

  const iconName = isDone ? 'checkmark-circle' : 'cart-outline';
  
  // Correction ici : on utilise directement s.textSec si possible, sinon on passe par activeTheme si besoin
  // Mais s.textSec est un objet {color: ...}, donc on peut l'utiliser directement dans le style
  
  return (
    <TouchableOpacity
      style={viewMode === 'grid' ? s.cardGrid : s.cardList}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {viewMode === 'grid' ? (
        // --- MODE GRID ---
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={[s.miniBadge, { backgroundColor: activeTheme.secondary }]}>
              <Ionicons name={iconName} size={18} color={activeTheme.primary} />
            </View>
            <TouchableOpacity onPress={onAction} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="ellipsis-horizontal" size={20} color={s.textSec.color} />
            </TouchableOpacity>
          </View>

          <Text style={s.cardTitle} numberOfLines={1}>{item.nomListe}</Text>
          
          <Text style={s.cardDate}>
            {format(new Date(item.dateAchat), 'dd MMM', {
              locale: language === 'en' ? enUS : fr,
            })}
          </Text>
          
          <Text style={[s.cardPrice, { color: activeTheme.primary }]}>
            {formatMoney(item.totalDepense)} {currency}
          </Text>
        </>
      ) : (
        // --- MODE LIST ---
        <>
          <View style={[s.dateBox, { backgroundColor: activeTheme.secondary }]}>
            <Ionicons name={iconName} size={20} color={activeTheme.primary} />
          </View>

          <View style={{ flex: 1, paddingHorizontal: 15 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.nomListe}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={s.cardDate}>
                {item.nombreArticles} {language === 'mg' ? 'entana' : 'articles'}
              </Text>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#CBD5E1',
                  marginHorizontal: 6,
                }}
              />
              <Text style={{ fontSize: 14, fontWeight: '700', color: activeTheme.primary }}>
                {formatMoney(item.totalDepense)} {currency}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onAction}
            style={s.moreBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={s.textSec.color} />
          </TouchableOpacity>
        </>
      )}
    </TouchableOpacity>
  );
};

// --- MODALS ---
const ThemesModal = ({ visible, onClose, currentTheme, setTheme, s, translations, isDarkMode }: any) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1}>
      <View style={s.modalCard}>
        <View style={s.modalHeaderCenter}>
          <Text style={s.modalTitle}>{translations.choose_theme}</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={20} color={s.textSec.color} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.themeGrid} showsVerticalScrollIndicator={false}>
          {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((key) => {
            const th = THEMES[key];
            const isActive = currentTheme === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  setTheme(key);
                  onClose();
                }}
                style={[s.themeItemWrapper, isActive && s.themeItemActive]}
                activeOpacity={0.8}
              >
                <View style={[s.previewPhone, { borderColor: isActive ? th.primary : s.border.borderColor }]}>
                  <View style={[s.previewHeader, { backgroundColor: th.primary }]}>
                    <View style={{ width: 20, height: 3, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 2 }} />
                  </View>
                  <View style={[s.previewBody, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC' }]}>
                    <View style={[s.previewFab, { backgroundColor: th.primary }]}>
                      <Ionicons name="add" size={8} color="#fff" />
                    </View>
                  </View>
                  {isActive && (
                    <View style={[s.activeCheckBadge, { backgroundColor: th.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    s.themeName,
                    { color: isActive ? th.primary : s.textSec.color, fontWeight: isActive ? '700' : '500' },
                  ]}
                >
                  {th.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

const SettingsModal = ({ visible, onClose, isDarkMode, toggleDarkMode, language, setLanguage, setShowHelp, s, activeTheme, translations }: any) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={s.modalContainerFull}>
      <View style={s.modalHeader}>
        <Text style={s.modalBigTitle}>{translations.settings}</Text>
        <TouchableOpacity onPress={onClose} style={s.closeCircle}>
          <Ionicons name="close" size={24} color={s.text.color} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ padding: 20 }}>
        <Text style={s.sectionHeader}>APPARENCE</Text>
        <View style={s.settingSection}>
          <View style={s.settingRow}>
            <View style={[s.iconBox, { backgroundColor: activeTheme.secondary }]}>
              <Ionicons name="moon" size={20} color={activeTheme.primary} />
            </View>
            <Text style={s.settingText}>{translations.dark_mode}</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ true: activeTheme.primary, false: '#E0E0E0' }}
            />
          </View>
        </View>
        <Text style={s.sectionHeader}>GÉNÉRAL</Text>
        <View style={s.settingSection}>
          <View style={[s.settingRow, { borderBottomWidth: 0 }]}>
            <View style={[s.iconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="language" size={20} color="#0284C7" />
            </View>
            <Text style={s.settingText}>{translations.language}</Text>
            <View
              style={{
                flexDirection: 'row',
                gap: 5,
                backgroundColor: s.bg.backgroundColor,
                padding: 4,
                borderRadius: 8,
              }}
            >
              {['fr', 'mg'].map((l) => (
                <TouchableOpacity
                  key={l}
                  onPress={() => setLanguage(l as any)}
                  style={[
                    s.langBtn,
                    language === l && { backgroundColor: activeTheme.primary, shadowOpacity: 0.1 },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: language === l ? '#fff' : s.textSec.color,
                    }}
                  >
                    {l.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
        
        <Text style={s.sectionHeader}>AIDE</Text>
        <View style={s.settingSection}>
           <TouchableOpacity style={[s.settingRow, {borderBottomWidth:0}]} onPress={() => setShowHelp(true)}>
              <View style={[s.iconBox, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="bulb" size={20} color="#D97706" />
              </View>
              <Text style={s.settingText}>{translations.help}</Text>
              <Ionicons name="chevron-forward" size={20} color={s.textSec.color} />
           </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  </Modal>
);

const ActionsModal = ({ visible, onClose, selectedAchat, handleRename, handleDelete, toggleStatus, s, activeTheme, translations }: any) => {
  const isHistory = selectedAchat?.statut === 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} onPress={onClose} activeOpacity={1}>
        <View style={s.actionSheetContainer}>
          <View style={s.dragHandle} />
          <View style={s.actionSheetHeader}>
            <View style={[s.iconCircle, { backgroundColor: activeTheme.secondary }]}>
              <Ionicons name="receipt-outline" size={24} color={activeTheme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionSheetTitle} numberOfLines={1}>
                {selectedAchat?.nomListe}
              </Text>
              <Text style={s.actionSheetSub}>{isHistory ? translations.history : translations.ongoing}</Text>
            </View>
          </View>
          <View style={s.actionList}>
            <TouchableOpacity
              style={[s.actionSheetBtn, { borderColor: isHistory ? '#10B981' : activeTheme.primary }]}
              onPress={toggleStatus}
            >
              <View style={[s.actionIcon, { backgroundColor: isHistory ? '#D1FAE5' : activeTheme.secondary }]}>
                <Ionicons 
                  name={isHistory ? "refresh" : "checkmark-circle"} 
                  size={20} 
                  color={isHistory ? "#059669" : activeTheme.primary} 
                />
              </View>
              <Text style={[s.actionText, { color: isHistory ? "#059669" : activeTheme.primary }]}>
                {isHistory ? translations.reopen_list : translations.mark_done}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.actionSheetBtn} onPress={handleRename}>
              <View style={[s.actionIcon, { backgroundColor: s.bg.backgroundColor }]}>
                <Ionicons name="pencil" size={20} color={s.text.color} />
              </View>
              <Text style={s.actionText}>{translations.rename}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={s.actionSheetBtn} onPress={handleDelete}>
              <View style={[s.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash" size={20} color="#EF4444" />
              </View>
              <Text style={[s.actionText, { color: '#EF4444' }]}>{translations.delete}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelText}>{translations.cancel}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const SortModal = ({ visible, onClose, setSortMode, s, translations }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity style={s.backdrop} onPress={onClose}>
      <View style={s.modalCard}>
        <Text style={[s.modalTitle, { marginBottom: 15 }]}>{translations.sort_by}</Text>
        <TouchableOpacity
          onPress={() => {
            setSortMode('date');
            onClose();
          }}
          style={{ padding: 16, borderBottomWidth: 1, borderColor: s.border.borderColor }}
        >
          <Text style={{ textTransform: 'capitalize', color: s.text.color }}>
            {translations.sort_date}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setSortMode('amount');
            onClose();
          }}
          style={{ padding: 16 }}
        >
          <Text style={{ textTransform: 'capitalize', color: s.text.color }}>
            {translations.sort_amount}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

const HelpModal = ({ visible, onClose, s, activeTheme, translations }: any) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={s.backdrop}>
      <View style={s.modalCard}>
        <Ionicons
          name="bulb-outline"
          size={40}
          color="#F59E0B"
          style={{ alignSelf: 'center', marginBottom: 10 }}
        />
        <Text style={[s.modalTitle, { textAlign: 'center' }]}>{translations.tips_title}</Text>
        <ScrollView style={{ maxHeight: 300, marginVertical: 15 }}>
          {translations.tips_content.map((tip: string, i: number) => (
            <Text
              key={i}
              style={{ marginBottom: 8, color: s.textSec.color, lineHeight: 20 }}
            >
              • {tip}
            </Text>
          ))}
        </ScrollView>
        <TouchableOpacity
          onPress={onClose}
          style={{
            backgroundColor: activeTheme.primary,
            padding: 12,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>{translations.understood}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default function Home() {
  const { currentTheme, setTheme, activeTheme, isDarkMode, toggleDarkMode, getStyles } = useTheme();
  const { currency, language, setLanguage } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(styles);

  const TEXTS = TRADUCTIONS[language] || TRADUCTIONS.fr;
  
  const [achats, setAchats] = useState<Achat[]>([]);
  const [filteredAchats, setFilteredAchats] = useState<Achat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortMode, setSortMode] = useState<'date' | 'name' | 'amount'>('date');
  
  const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');

  const [showSettings, setShowSettings] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);
  
  const [deleteModal, setDeleteModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  const [unreadCount, setUnreadCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Calculs Dashboard
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyAchats = achats.filter(a => { const d = new Date(a.dateAchat); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; });
  const monthlyExpenses = monthlyAchats.reduce((acc, item) => acc + item.totalDepense, 0);
  const monthlyArticlesCount = monthlyAchats.reduce((acc, item) => acc + item.nombreArticles, 0);
  const monthName = format(new Date(), 'MMM', { locale: language === 'en' ? enUS : fr });

  const ensureSchema = (db: any) => {
    try {
      const info = db.getAllSync("PRAGMA table_info(Achat)");
      const hasStatut = info.some((col: any) => col.name === 'statut');
      if (!hasStatut) {
        db.runSync("ALTER TABLE Achat ADD COLUMN statut INTEGER DEFAULT 0");
      }
    } catch (e) { console.log("Schema check error", e); }
  };

  const loadData = useCallback(() => {
    try {
      const db = getDb();
      ensureSchema(db);
      db.runSync(`DELETE FROM Achat WHERE (nomListe = 'Nouvelle Liste' OR nomListe = '' OR nomListe IS NULL) AND id NOT IN (SELECT DISTINCT idAchat FROM LigneAchat)`);
      const result = db.getAllSync(`SELECT a.id, a.nomListe, a.dateAchat, a.statut, COALESCE(SUM(l.prixTotal), 0) as totalDepense, COUNT(l.id) as nombreArticles FROM Achat a LEFT JOIN LigneAchat l ON a.id = l.idAchat GROUP BY a.id ORDER BY a.dateAchat DESC`);
      
      if (NotifService.getUnreadNotificationCount) setUnreadCount(NotifService.getUnreadNotificationCount());

      let sorted = [...(result as Achat[])];
      if (sortMode === 'name') sorted.sort((a, b) => a.nomListe.localeCompare(b.nomListe));
      else if (sortMode === 'amount') sorted.sort((a, b) => b.totalDepense - a.totalDepense);
      
      setAchats(sorted);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e) { console.error(e); }
  }, [sortMode]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    let filtered = achats;
    if (searchQuery !== '') filtered = filtered.filter(a => a.nomListe.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeTab === 'ongoing') {
      filtered = filtered.filter(a => (a.statut === 0 || a.statut === null));
    } else {
      filtered = filtered.filter(a => a.statut === 1);
    }
    setFilteredAchats(filtered);
  }, [searchQuery, achats, activeTab]);

  const handleCreate = () => { try { const db = getDb(); const res = db.runSync('INSERT INTO Achat (nomListe, dateAchat, statut) VALUES (?, ?, 0)', ['', new Date().toISOString()]); router.push(`/achat/${res.lastInsertRowId}`); } catch (e) { console.error(e); } };
  
  const handleOpenList = (item: Achat) => {
      const isReadOnly = item.statut === 1;
      router.push({
          pathname: `/achat/${item.id}`,
          params: { readOnly: isReadOnly ? '1' : '0' }
      });
  };

  const toggleStatus = () => {
    if (!selectedAchat) return;
    
    const newStatus = selectedAchat.statut === 1 ? 0 : 1;
    
    // Si on veut marquer comme terminé, on demande confirmation sur les prix
    if (newStatus === 1) {
        Alert.alert(
            TEXTS.check_prices_title,
            TEXTS.check_prices_msg,
            [
                { text: TEXTS.cancel, style: "cancel" },
                { 
                    text: TEXTS.confirm, 
                    onPress: () => {
                        try {
                            getDb().runSync('UPDATE Achat SET statut = 1 WHERE id = ?', [selectedAchat.id]);
                            setShowActions(false);
                            loadData();
                            Alert.alert(TEXTS.done, TEXTS.list_archived);
                        } catch (e) { console.error(e); }
                    } 
                }
            ]
        );
    } else {
        // Si on veut rouvrir
        try {
            getDb().runSync('UPDATE Achat SET statut = 0 WHERE id = ?', [selectedAchat.id]);
            setShowActions(false);
            loadData();
            Alert.alert(TEXTS.reopened, TEXTS.list_active);
        } catch (e) { console.error(e); }
    }
  };

  const handleRename = () => { if (!selectedAchat) return; setNewListName(selectedAchat.nomListe); setShowActions(false); setTimeout(() => setRenameModal(true), 300); };
  const confirmRename = () => { if (!selectedAchat || !newListName.trim()) return; try { getDb().runSync('UPDATE Achat SET nomListe = ? WHERE id = ?', [newListName.trim(), selectedAchat.id]); setRenameModal(false); setNewListName(''); loadData(); } catch (e) {} };
  
  const handleDelete = () => { setShowActions(false); setTimeout(() => setDeleteModal(true), 300); };
  const confirmDelete = () => { if (!selectedAchat) return; try { getDb().runSync('DELETE FROM LigneAchat WHERE idAchat = ?', [selectedAchat.id]); getDb().runSync('DELETE FROM Achat WHERE id = ?', [selectedAchat.id]); setDeleteModal(false); loadData(); } catch (e) {} };

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      <LinearGradient colors={activeTheme?.gradient || ['#7143b5', '#8b5fd4']} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <BazarHeader />
        <View style={s.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo size={42} colors={['#fff', '#E0E7FF'] as any} animated={true} />
            <View>
              <Text style={s.appName}>e-tsena</Text>
              <Text style={s.appSub}>Assistant courses</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
             <TouchableOpacity style={s.iconBtn} onPress={() => setShowThemes(true)}><Ionicons name="color-palette-outline" size={20} color="#fff" /></TouchableOpacity>
             <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications')}><Ionicons name="notifications-outline" size={20} color="#fff" />{unreadCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}</TouchableOpacity>
             <TouchableOpacity style={s.iconBtn} onPress={() => setShowSettings(true)}><Ionicons name="settings-outline" size={20} color="#fff" /></TouchableOpacity>
          </View>
        </View>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.7)" />
          <TextInput style={s.searchInput} placeholder={TEXTS.search} placeholderTextColor="rgba(255,255,255,0.6)" value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <View style={s.tabContainer}>
           <TouchableOpacity style={[s.tabBtn, activeTab === 'ongoing' && s.tabActive]} onPress={() => setActiveTab('ongoing')}>
              <Text style={[s.tabText, activeTab === 'ongoing' && { color: activeTheme.primary, fontWeight: '700' }]}>{TEXTS.ongoing}</Text>
           </TouchableOpacity>
           <TouchableOpacity style={[s.tabBtn, activeTab === 'history' && s.tabActive]} onPress={() => setActiveTab('history')}>
              <Text style={[s.tabText, activeTab === 'history' && { color: activeTheme.primary, fontWeight: '700' }]}>{TEXTS.history}</Text>
           </TouchableOpacity>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="wallet-outline" size={16} color={s.textSec.color} />
              <Text style={s.summaryLabel}>{TEXTS.expenses} ({monthName})</Text>
            </View>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{formatMoney(monthlyExpenses)} {currency}</Text>
          </View>
          <View style={s.verticalDivider} />
          <View style={s.summaryItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="cube-outline" size={16} color={s.textSec.color} />
              <Text style={s.summaryLabel}>{TEXTS.articles} ({monthName})</Text>
            </View>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{monthlyArticlesCount}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={s.content}>
        <View style={s.controlBar}>
          <Text style={s.sectionTitle}>
              {activeTab === 'ongoing' ? TEXTS.list_ongoing_title : TEXTS.list_history_title}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.outlineBtn} onPress={() => setShowSort(true)}><Ionicons name="filter-outline" size={16} color={s.textSec.color} /></TouchableOpacity>
            <View style={s.viewToggle}>
               <TouchableOpacity onPress={() => setViewMode('list')} style={[s.toggleBtn, viewMode === 'list' && s.toggleActive]}><Ionicons name="list" size={18} color={viewMode === 'list' ? activeTheme.primary : s.text.color} /></TouchableOpacity>
               <TouchableOpacity onPress={() => setViewMode('grid')} style={[s.toggleBtn, viewMode === 'grid' && s.toggleActive]}><Ionicons name="grid" size={16} color={viewMode === 'grid' ? activeTheme.primary : s.text.color} /></TouchableOpacity>
            </View>
          </View>
        </View>

        <Animated.ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} style={{ opacity: fadeAnim }}>
          {filteredAchats.length > 0 ? (
            <View style={viewMode === 'grid' ? s.grid : s.list}>
              {filteredAchats.map((item) => (
                <AchatItem key={item.id} item={item} viewMode={viewMode} s={s} activeTheme={activeTheme} language={language} currency={currency} onPress={() => handleOpenList(item)} onAction={() => { setSelectedAchat(item); setShowActions(true); }} />
              ))}
            </View>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.6 }}>
               <Ionicons name={activeTab === 'ongoing' ? "basket-outline" : "file-tray-outline"} size={50} color={s.textSec.color} />
               <Text style={{ color: s.textSec.color, marginTop: 10 }}>
                  {activeTab === 'ongoing' ? TEXTS.empty_ongoing : TEXTS.empty_history}
               </Text>
            </View>
          )}
        </Animated.ScrollView>
      </View>

      <View style={[s.navbar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10, height: 60 + (insets.bottom > 0 ? insets.bottom : 10) }]}>
         <TouchableOpacity style={s.navItem} onPress={loadData}><Ionicons name="home" size={24} color={activeTheme.primary} /><Text style={[s.navText, { color: activeTheme.primary }]}>{TEXTS.welcome}</Text></TouchableOpacity>
         <View style={{ top: -25 }}><TouchableOpacity style={[s.fab, { shadowColor: activeTheme.primary }]} onPress={handleCreate} activeOpacity={0.8}><LinearGradient colors={activeTheme?.gradient || ['#7143b5', '#8b5fd4']} style={s.fabGradient}><Ionicons name="add" size={32} color="#fff" /></LinearGradient></TouchableOpacity></View>
         <TouchableOpacity style={s.navItem} onPress={() => router.push('/rapports')}><Ionicons name="pie-chart-outline" size={24} color="#9CA3AF" /><Text style={[s.navText, { color: "#9CA3AF" }]}>{TEXTS.reports}</Text></TouchableOpacity>
      </View>

      <ThemesModal visible={showThemes} onClose={() => setShowThemes(false)} currentTheme={currentTheme} setTheme={setTheme} s={s} translations={TEXTS} isDarkMode={isDarkMode} />
      <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} language={language} setLanguage={setLanguage} setShowHelp={setShowHelp} s={s} activeTheme={activeTheme} translations={TEXTS} />
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} s={s} activeTheme={activeTheme} translations={TEXTS} />
      <SortModal visible={showSort} onClose={() => setShowSort(false)} setSortMode={setSortMode} s={s} translations={TEXTS} />
      <ActionsModal visible={showActions} onClose={() => setShowActions(false)} selectedAchat={selectedAchat} handleRename={handleRename} handleDelete={handleDelete} toggleStatus={toggleStatus} s={s} activeTheme={activeTheme} translations={TEXTS} />
      
      <BeautifulConfirmModal 
        visible={deleteModal} 
        title={TEXTS.delete_title} 
        message={`${TEXTS.delete_msg} "${selectedAchat?.nomListe}"`} 
        onConfirm={confirmDelete} 
        onCancel={() => setDeleteModal(false)} 
        confirmText={TEXTS.delete} 
        cancelText={TEXTS.cancel} 
        activeTheme={activeTheme}
        type="danger"
      />

      <Modal visible={renameModal} transparent animationType="fade" onRequestClose={() => setRenameModal(false)}><TouchableOpacity style={s.backdrop} onPress={() => setRenameModal(false)}><View style={s.modalCard}><Text style={s.modalTitle}>{TEXTS.rename}</Text><TextInput style={s.simpleInput} value={newListName} onChangeText={setNewListName} autoFocus /><View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}><TouchableOpacity onPress={() => setRenameModal(false)} style={s.btnCancel}><Text style={s.btnCancelText}>{TEXTS.cancel}</Text></TouchableOpacity><TouchableOpacity onPress={confirmRename} style={[s.btnConfirm, { backgroundColor: activeTheme.primary }]}><Text style={s.btnConfirmText}>{TEXTS.save}</Text></TouchableOpacity></View></View></TouchableOpacity></Modal>
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  // UTILS (Pour éviter l'erreur "color of undefined")
  text: { color: c.text },
  textSec: { color: c.textSec },
  border: { borderColor: c.border },
  bg: { backgroundColor: c.bg },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: c.card, borderRadius: 28, padding: 24, alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitleText: { fontSize: 20, fontWeight: '800', color: c.text, textAlign: 'center', marginBottom: 10 },
  modalMessageText: { fontSize: 15, color: c.textSec, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  modalBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtnCancel: { flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  modalBtnConfirm: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center', shadowOpacity: 0.2, elevation: 4 },
  modalBtnCancelText: { fontSize: 16, fontWeight: '600', color: c.textSec },
  modalBtnConfirmText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  container: { flex: 1, backgroundColor: c.bg },
  header: { paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, position: 'relative' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  appName: { fontSize: 22, fontWeight: '800', color: '#fff' },
  appSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  iconBtn: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  badge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', paddingHorizontal: 3 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 18, height: 52, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 16 },
  tabContainer: { flexDirection: 'row', marginTop: 15, backgroundColor: 'rgba(0,0,0,0.1)', padding: 4, borderRadius: 12, marginHorizontal: 20 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  summaryRow: { position: 'absolute', bottom: -35, left: 20, right: 20, flexDirection: 'row', backgroundColor: c.card, borderRadius: 24, paddingVertical: 20, paddingHorizontal: 10, justifyContent: 'space-around', shadowColor: '#000', shadowOffset: {width: 0, height: 8}, shadowOpacity: c.shadow, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: c.border },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryLabel: { color: c.textSec, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  verticalDivider: { width: 1, backgroundColor: c.border, height: '60%' },
  content: { flex: 1, marginTop: 55, paddingHorizontal: 20 },
  controlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text },
  outlineBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.card },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.card, overflow: 'hidden' },
  toggleBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: c.border },
  list: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardList: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 16, borderRadius: 20, marginBottom: 4, borderWidth: 1, borderColor: c.border, shadowColor: c.text, shadowOffset: {width: 0, height: 2}, shadowOpacity: c.shadow, shadowRadius: 6, elevation: 2 },
  cardGrid: { width: (SCREEN_WIDTH - 52) / 2, height: 170, backgroundColor: c.card, padding: 16, borderRadius: 20, marginBottom: 15, justifyContent: 'space-between', borderWidth: 0, shadowColor: c.text, shadowOffset: {width: 0, height: 2}, shadowOpacity: c.shadow, shadowRadius: 6, elevation: 2 },
  dateBox: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  miniBadge: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginTop: 8 },
  cardDate: { fontSize: 12, color: c.textSec },
  cardPrice: { fontSize: 16, fontWeight: '800', marginTop: 'auto' },
  moreBtn: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  navbar: { flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 1, borderColor: c.border, justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 20, position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  fab: { width: 56, height: 56, borderRadius: 28, shadowOpacity: 0.3, elevation: 6 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  actionSheetContainer: { width: '100%', backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, position: 'absolute', bottom: 0, shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20 },
  dragHandle: { width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  actionSheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25, paddingBottom: 20, borderBottomWidth: 1, borderColor: c.border },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  actionSheetTitle: { fontSize: 18, fontWeight: '700', color: c.text },
  actionSheetSub: { fontSize: 13, color: c.textSec, marginTop: 2 },
  actionList: { gap: 12 },
  actionSheetBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: c.bg, borderRadius: 16, borderWidth: 1, borderColor: c.border },
  actionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  actionText: { flex: 1, fontSize: 16, fontWeight: '600', color: c.text },
  cancelBtn: { marginTop: 20, padding: 16, alignItems: 'center' },
  cancelText: { fontSize: 16, fontWeight: '600', color: c.textSec },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 10, paddingBottom: 20 },
  themeItemWrapper: { width: '30%', marginBottom: 20, alignItems: 'center', opacity: 0.9 },
  themeItemActive: { opacity: 1, transform: [{ scale: 1.05 }] },
  previewPhone: { width: 75, height: 130, borderRadius: 10, overflow: 'hidden', borderWidth: 1.5, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4, backgroundColor: c.bg, position: 'relative' },
  previewHeader: { width: '100%', height: 35, justifyContent: 'center', alignItems: 'center', paddingTop: 5 },
  previewBody: { flex: 1, padding: 6, gap: 6, position: 'relative' },
  previewCard: { width: '100%', height: 20, borderRadius: 6, padding: 4, justifyContent: 'center' },
  previewFab: { position: 'absolute', bottom: 8, right: 8, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.2, elevation: 2 },
  activeCheckBadge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fff', zIndex: 10 },
  themeName: { fontSize: 12, marginTop: 8, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', backgroundColor: c.card, padding: 24, borderRadius: 24, elevation: 10, maxHeight: '80%' },
  modalContainerFull: { flex: 1, backgroundColor: c.bg, marginTop: 50, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: c.border },
  modalHeaderCenter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, position: 'relative' },
  closeBtn: { position: 'absolute', right: 0, padding: 5 },
  closeCircle: { padding: 8, backgroundColor: c.border, borderRadius: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: c.text, textAlign: 'center' },
  modalBigTitle: { fontSize: 24, fontWeight: '800', color: c.text },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: c.textSec, marginTop: 20, marginBottom: 10, letterSpacing: 1 },
  settingSection: { backgroundColor: c.card, borderRadius: 16, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: c.border },
  settingText: { flex: 1, fontSize: 16, fontWeight: '600', color: c.text, marginLeft: 15 },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  langBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  simpleInput: { backgroundColor: c.input, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, fontSize: 16, color: c.text, marginVertical: 15 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: c.bg, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  btnConfirm: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnCancelText: { color: c.textSec, fontWeight: '600' },
  btnConfirmText: { color: '#fff', fontWeight: 'bold' },
  bg: { backgroundColor: c.bg },
  text: { color: c.text },
  textSec: { color: c.textSec },
  border: { borderColor: c.border }
});