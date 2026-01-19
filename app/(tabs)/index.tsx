import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  TextInput, Modal, Switch, Dimensions, Animated, Alert
} from 'react-native';
import { ThemedStatusBar } from '../../src/components/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';

import { getDb } from '../../src/db/init';
import { useTheme, THEMES } from '../../src/context/ThemeContext'; 
import { useSettings } from '../../src/context/SettingsContext'; 
import * as NotifService from '../../src/services/notificationService';
import * as VoiceService from '../../src/services/voiceService';

// ✅ IMPORT DES LOGOS
import { MiniLogo, HeaderLogo } from '../../src/components/Logo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const formatMoney = (value: number) => {
  if (!value && value !== 0) return '0';
  const num = Number(value);
  if (Number.isNaN(num)) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }
  if (num >= 100000) {
    return (num / 1000).toFixed(0) + 'k';
  }
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const TEXTS = {
  ongoing: 'En cours',
  history: 'Historique',
  list_ongoing_title: 'Listes Récentes',
  list_history_title: 'Historique',
  mark_done: 'Marquer comme terminé',
  rename: 'Renommer',
  delete: 'Supprimer',
  cancel: 'Annuler',
  confirm: 'Confirmer',
  save: 'Enregistrer',
  empty_ongoing: 'Aucune liste en cours',
  empty_history: 'Aucun historique',
  search: 'Rechercher une liste...',
  check_prices_title: 'Vérification',
  check_prices_msg: 'Avez-vous bien vérifié les prix réels avant de terminer ?',
  delete_title: 'Supprimer la liste ?',
  delete_msg: 'Cette action est irréversible.',
  expenses: 'Dépenses',
  articles: 'Articles',
  welcome: 'Accueil',
  reports: 'Rapports',
  settings: 'Paramètres',
  choose_theme: 'Choisir un thème',
  dark_mode: 'Mode sombre',
  help: 'Aide & Guide',
  sort_by: 'Trier par',
  sort_date: 'Date',
  sort_name: 'Nom',
  sort_amount: 'Montant',
  list_archived: "Liste déplacée dans l'historique",
  done: "Terminé",
  appearance: "APPARENCE",
  support: "SUPPORT",
  help_title: "Aide & Guide d'utilisation",
  help_subtitle: "Tout ce que vous devez savoir",
  getting_started: "Premiers pas",
  features: "Fonctionnalités",
  tips_tricks: "Astuces",
  faq: "Questions fréquentes",
  got_it: "J'ai compris",
  monthly_summary: "Ce mois",
  gs_title: "🚀 Démarrer avec E-Tsena",
  gs_1: "Appuyez sur le bouton + pour créer une nouvelle liste",
  gs_2: "Ajoutez vos produits en tapant leur nom",
  gs_3: "Touchez un produit pour entrer la quantité et le prix",
  gs_4: "Une fois terminé, marquez la liste comme 'Terminée'",
  gs_5: "Consultez vos rapports pour suivre vos dépenses",
  ft_title: "✨ Fonctionnalités principales",
  ft_1: "📝 Création de listes illimitées",
  ft_2: "💰 Suivi du budget avec alertes",
  ft_3: "📊 Rapports détaillés et graphiques",
  ft_4: "🔔 Rappels programmables",
  ft_5: "🎨 Thèmes personnalisables",
  ft_6: "📱 Historique complet",
  ft_7: "🔍 Recherche et tri des listes",
  tp_title: "💡 Astuces",
  tp_1: "Appui long sur un produit pour modifier son nom",
  tp_2: "Les prix suggérés sont basés sur vos achats précédents",
  tp_3: "Définissez un budget pour recevoir des alertes",
  tp_4: "Les listes terminées ne peuvent plus être modifiées",
  faq_title: "❓ Questions fréquentes",
  faq_q1: "Comment supprimer un article ?",
  faq_a1: "Appuyez sur le bouton X à côté de l'article.",
  faq_q2: "Puis-je modifier une liste terminée ?",
  faq_a2: "Non, les listes terminées sont en lecture seule.",
  faq_q3: "Comment définir un budget ?",
  faq_a3: "Touchez l'icône portefeuille dans une liste.",
  faq_q4: "Mes données sont-elles sauvegardées ?",
  faq_a4: "Oui, localement sur votre appareil.",
};

// ============================================
// 🔔 MODAL DE CONFIRMATION
// ============================================
const BeautifulConfirmModal = ({ visible, title, message, onConfirm, onCancel, confirmText, cancelText, activeTheme, isDarkMode, type = 'danger' }: any) => {
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

  if (!visible) return null;

  const isDanger = type === 'danger';
  const mainColor = isDanger ? '#EF4444' : activeTheme.primary;
  const bgColor = isDarkMode ? '#1E293B' : '#fff';
  const textColor = isDarkMode ? '#F1F5F9' : '#1E293B';
  const subColor = isDarkMode ? '#94A3B8' : '#64748B';
  
  const iconBg = isDanger 
    ? (isDarkMode ? '#7F1D1D' : '#FEE2E2') 
    : activeTheme.secondary;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
        <Animated.View style={{ width: '85%', backgroundColor: bgColor, borderRadius: 28, padding: 24, alignItems: 'center', elevation: 15, transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
          <View style={{ 
            width: 64, 
            height: 64, 
            borderRadius: 32, 
            backgroundColor: iconBg, 
            justifyContent: 'center', 
            alignItems: 'center', 
            marginBottom: 20 
          }}>
            <Ionicons name={isDanger ? "trash-outline" : "alert-circle-outline"} size={32} color={mainColor} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '800', color: textColor, textAlign: 'center', marginBottom: 10 }}>{title}</Text>
          <Text style={{ fontSize: 15, color: subColor, textAlign: 'center', marginBottom: 25, lineHeight: 22 }}>{message}</Text>
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <TouchableOpacity onPress={onCancel} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: isDarkMode ? '#334155' : '#E2E8F0', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: subColor }}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: mainColor, alignItems: 'center', elevation: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

interface Achat {
  idAchat: number;
  nomListe: string;
  dateAchat: string;
  totalDepense: number;
  nombreArticles: number;
  statut: number;
}

// ============================================
// 🎴 CARD RÉORGANISÉE - Articles à côté de la date
// ============================================
const AchatCard = ({ item, viewMode, activeTheme, currency, onPress, onAction, isDarkMode }: any) => {
  const isDone = item.statut === 1;
  const formattedDate = format(new Date(item.dateAchat), 'dd MMM yyyy', { locale: fr });
  const shortDate = format(new Date(item.dateAchat), 'dd MMM', { locale: fr });

  const cardBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const textColor = isDarkMode ? '#F1F5F9' : '#1E293B';
  const subColor = isDarkMode ? '#94A3B8' : '#64748B';
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0';

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, friction: 8, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }).start();
  };

  if (viewMode === 'grid') {
    // Largeur ajustée pour 2 colonnes avec gap
    // Screen (100%) - PaddingHorizontal (20*2=40) - Gap (12) = Espace dispo
    // / 2 pour chaque carte
    // On enlève quelques pixels supp de sécurité -> 55
    const cardWidth = (SCREEN_WIDTH - 55) / 2;
    
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: cardWidth, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={0.9}
          style={{
            backgroundColor: cardBg,
            borderRadius: 16,
            padding: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 3,
            minHeight: 160
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ 
               width: 40, height: 40, borderRadius: 12, 
               backgroundColor: activeTheme.secondary, 
               justifyContent: 'center', alignItems: 'center',
               shadowColor: activeTheme.primary,
               shadowOffset: { width: 0, height: 2 },
               shadowOpacity: 0.25,
               shadowRadius: 3.84,
               elevation: 5,
            }}>
              <MiniLogo size={24} color={activeTheme.primary} />
            </View>
            <TouchableOpacity onPress={onAction} hitSlop={10}>
                <Ionicons name="ellipsis-vertical" size={16} color={subColor} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, fontWeight: '700', color: textColor, marginBottom: 4 }} numberOfLines={2}>
            {item.nomListe || 'Sans nom'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, justifyContent: 'space-between', alignItems: 'center' }}>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="calendar-outline" size={12} color={subColor} />
                <Text style={{ fontSize: 10, color: subColor }}>{shortDate}</Text>
             </View>
             
             {/* Total articles added back */}
             <View style={{ 
               flexDirection: 'row', alignItems: 'center', gap: 3, 
               backgroundColor: activeTheme.secondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 
             }}>
                <Ionicons name="bag-handle" size={10} color={activeTheme.primary} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: activeTheme.primary }}>{item.nombreArticles}</Text>
             </View>
          </View>

          <Text style={{ fontSize: 17, fontWeight: '800', color: activeTheme.primary, marginTop: 'auto' }}>
             {formatMoney(item.totalDepense)} <Text style={{ fontSize: 12 }}>{currency}</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], marginBottom: 12 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: cardBg,
          padding: 16,
          borderRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View style={{ 
          width: 48, height: 48, borderRadius: 12, 
          backgroundColor: activeTheme.secondary, 
          justifyContent: 'center', alignItems: 'center',
          marginRight: 14
        }}>
          <MiniLogo size={24} color={activeTheme.primary} />
          {isDone && (
            <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: '#10B981', borderRadius: 8, padding: 2, borderWidth: 2, borderColor: cardBg }}>
              <Ionicons name="checkmark" size={10} color="white" />
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: textColor, flex: 1, marginRight: 8 }} numberOfLines={1}>
                 {item.nomListe || 'Sans nom'}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: activeTheme.primary }}>
                 {formatMoney(item.totalDepense)} {currency}
              </Text>
           </View>

           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <Ionicons name="calendar-outline" size={12} color={subColor} />
                 <Text style={{ fontSize: 12, color: subColor }}>{formattedDate}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                 <Ionicons name="bag-handle-outline" size={12} color={subColor} />
                 <Text style={{ fontSize: 12, color: subColor }}>{item.nombreArticles} arts.</Text>
              </View>
           </View>
        </View>
        
        <TouchableOpacity onPress={onAction} style={{ padding: 8, marginLeft: 4 }}>
           <Ionicons name="ellipsis-vertical" size={18} color={subColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================
// 📚 MODAL AIDE
// ============================================
const HelpModal = ({ visible, onClose, activeTheme, isDarkMode }: any) => {
  const [activeSection, setActiveSection] = useState<'start' | 'features' | 'tips' | 'faq'>('start');
  const bgColor = isDarkMode ? '#0F172A' : '#F8FAFC';
  const cardBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const textColor = isDarkMode ? '#F1F5F9' : '#1E293B';
  const subColor = isDarkMode ? '#94A3B8' : '#64748B';
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0';

  const sections = [
    { id: 'start', icon: 'rocket-outline', label: TEXTS.getting_started, color: '#3B82F6' },
    { id: 'features', icon: 'star-outline', label: TEXTS.features, color: '#8B5CF6' },
    { id: 'tips', icon: 'bulb-outline', label: TEXTS.tips_tricks, color: '#F59E0B' },
    { id: 'faq', icon: 'help-circle-outline', label: TEXTS.faq, color: '#10B981' },
  ];

  const renderContent = () => {
    const items: string[] = [];
    let title = '';
    
    switch (activeSection) {
      case 'start':
        title = TEXTS.gs_title;
        items.push(TEXTS.gs_1, TEXTS.gs_2, TEXTS.gs_3, TEXTS.gs_4, TEXTS.gs_5);
        break;
      case 'features':
        title = TEXTS.ft_title;
        items.push(TEXTS.ft_1, TEXTS.ft_2, TEXTS.ft_3, TEXTS.ft_4, TEXTS.ft_5, TEXTS.ft_6, TEXTS.ft_7);
        break;
      case 'tips':
        title = TEXTS.tp_title;
        items.push(TEXTS.tp_1, TEXTS.tp_2, TEXTS.tp_3, TEXTS.tp_4);
        break;
      case 'faq':
        return (
          <View style={{ paddingTop: 15 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: textColor, marginBottom: 15 }}>{TEXTS.faq_title}</Text>
            {[
              { q: TEXTS.faq_q1, a: TEXTS.faq_a1 },
              { q: TEXTS.faq_q2, a: TEXTS.faq_a2 },
              { q: TEXTS.faq_q3, a: TEXTS.faq_a3 },
              { q: TEXTS.faq_q4, a: TEXTS.faq_a4 },
            ].map((item) => (
              <View key={item.q} style={{ backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor, padding: 14, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Ionicons name="help-circle" size={18} color={activeTheme.primary} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: textColor }}>{item.q}</Text>
                </View>
                <Text style={{ fontSize: 13, lineHeight: 20, color: subColor, paddingLeft: 28 }}>{item.a}</Text>
              </View>
            ))}
          </View>
        );
    }

    return (
      <View style={{ paddingTop: 15 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: textColor, marginBottom: 15 }}>{title}</Text>
        {items.map((text, i) => (
          <View key={`item-${activeSection}-${i}`} style={{ flexDirection: 'row', backgroundColor: cardBg, borderRadius: 14, borderWidth: 1, borderColor, padding: 14, marginBottom: 10, gap: 12 }}>
            {activeSection === 'start' && (
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: activeTheme.primary, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{i + 1}</Text>
              </View>
            )}
            {activeSection === 'tips' && (
              <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="flash" size={14} color="#F59E0B" />
              </View>
            )}
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: textColor }}>{text}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, marginTop: 50, backgroundColor: bgColor, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, borderColor }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: textColor }}>{TEXTS.help_title}</Text>
            <Text style={{ fontSize: 13, color: subColor, marginTop: 4 }}>{TEXTS.help_subtitle}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? '#334155' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 55 }} contentContainerStyle={{ paddingHorizontal: 15, paddingVertical: 8, gap: 8 }}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.id}
              onPress={() => setActiveSection(section.id as any)}
              style={{
                flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
                borderColor: activeSection === section.id ? section.color : borderColor,
                backgroundColor: activeSection === section.id ? section.color + '20' : 'transparent', gap: 6,
              }}
            >
              <Ionicons name={section.icon as any} size={18} color={activeSection === section.id ? section.color : subColor} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: activeSection === section.id ? section.color : subColor }}>{section.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
          {renderContent()}
          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={{ padding: 20, borderTopWidth: 1, borderColor, backgroundColor: bgColor }}>
          <TouchableOpacity onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, backgroundColor: activeTheme.primary, gap: 8 }}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{TEXTS.got_it}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const SettingsModal = ({ visible, onClose, isDarkMode, toggleDarkMode, currentTheme, setTheme, setShowHelp, activeTheme }: any) => {
  const [showThemes, setShowThemes] = useState(false);
  const bgColor = isDarkMode ? '#0F172A' : '#F8FAFC';
  const cardBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const textColor = isDarkMode ? '#F1F5F9' : '#1E293B';
  const subColor = isDarkMode ? '#94A3B8' : '#64748B';
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, marginTop: 50, backgroundColor: bgColor, borderTopLeftRadius: 30, borderTopRightRadius: 30 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: textColor }}>{TEXTS.settings}</Text>
          <TouchableOpacity onPress={onClose} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? '#334155' : '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="close" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ padding: 20 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, marginTop: 10, marginBottom: 10, letterSpacing: 1 }}>{TEXTS.appearance}</Text>
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isDarkMode ? '#312E81' : '#EEF2FF', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="moon-outline" size={20} color={isDarkMode ? '#A5B4FC' : '#6366F1'} />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: textColor, marginLeft: 14 }}>{TEXTS.dark_mode}</Text>
              <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ true: activeTheme.primary, false: isDarkMode ? '#475569' : '#E0E0E0' }} thumbColor="#fff" />
            </View>

            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }} onPress={() => setShowThemes(!showThemes)}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: activeTheme.secondary, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="color-palette-outline" size={20} color={activeTheme.primary} />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: textColor, marginLeft: 14 }}>{TEXTS.choose_theme}</Text>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: activeTheme.primary, marginRight: 8 }} />
              <Ionicons name={showThemes ? "chevron-up" : "chevron-down"} size={20} color={subColor} />
            </TouchableOpacity>

            {showThemes && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12, justifyContent: 'center', borderTopWidth: 1, borderColor }}>
                {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((key) => {
                  const th = THEMES[key];
                  const isActive = currentTheme === key;
                  return (
                    <TouchableOpacity 
                      key={key} 
                      onPress={() => setTheme(key)} 
                      style={{ 
                        width: '46%', 
                        flexDirection: 'row',
                        alignItems: 'center', 
                        padding: 10, 
                        borderRadius: 14, 
                        borderWidth: isActive ? 2 : 1, 
                        borderColor: isActive ? th.primary : 'transparent',
                        backgroundColor: isActive ? th.secondary : (isDarkMode ? '#334155' : '#F8FAFC'),
                        gap: 10,
                        elevation: isActive ? 2 : 0
                      }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: th.primary, justifyContent: 'center', alignItems: 'center' }}>
                         <Text style={{ fontSize: 16 }}>{th.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: isActive ? th.primary : textColor }}>{th.name}</Text>
                        <View style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: th.primary, marginTop: 4, opacity: 0.6 }} />
                      </View>
                      {isActive && <Ionicons name="checkmark-circle" size={18} color={th.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <Text style={{ fontSize: 12, fontWeight: '700', color: subColor, marginTop: 20, marginBottom: 10, letterSpacing: 1 }}>{TEXTS.support}</Text>
          <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 1, borderColor }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }} onPress={() => { onClose(); setTimeout(() => setShowHelp(true), 300); }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="information-circle-outline" size={20} color="#D97706" />
              </View>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: textColor, marginLeft: 14 }}>{TEXTS.help}</Text>
              <Ionicons name="chevron-forward" size={20} color={subColor} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const ActionsModal = ({ visible, onClose, selectedAchat, handleRename, handleDelete, toggleStatus, activeTheme, isDarkMode }: any) => {
  const isHistory = selectedAchat?.statut === 1;
  const bgColor = isDarkMode ? '#1E293B' : '#FFFFFF';
  const textColor = isDarkMode ? '#F1F5F9' : '#1E293B';
  const subColor = isDarkMode ? '#94A3B8' : '#64748B';
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0';
  const itemBg = isDarkMode ? '#0F172A' : '#F8FAFC';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }} onPress={onClose} activeOpacity={1}>
        <View style={{ backgroundColor: bgColor, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
          <View style={{ width: 40, height: 5, backgroundColor: borderColor, borderRadius: 3, alignSelf: 'center', marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25, paddingBottom: 20, borderBottomWidth: 1, borderColor }}>
            <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: activeTheme.secondary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: activeTheme.primary + '30' }}>
              <MiniLogo size={32} color={activeTheme.primary} />
              {isHistory && (
                <View style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: bgColor }}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: textColor }} numberOfLines={1}>{selectedAchat?.nomListe || 'Sans nom'}</Text>
              <Text style={{ fontSize: 13, color: subColor, marginTop: 3 }}>{isHistory ? TEXTS.history : TEXTS.ongoing}</Text>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            {!isHistory && (
              <>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: itemBg, borderRadius: 14, borderWidth: 1, borderColor }} onPress={toggleStatus}>
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: activeTheme.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Ionicons name="checkmark-circle" size={20} color={activeTheme.primary} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: activeTheme.primary }}>{TEXTS.mark_done}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: itemBg, borderRadius: 14, borderWidth: 1, borderColor }} onPress={handleRename}>
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: isDarkMode ? '#334155' : '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Ionicons name="pencil" size={20} color={textColor} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: textColor }}>{TEXTS.rename}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: itemBg, borderRadius: 14, borderWidth: 1, borderColor }} onPress={handleDelete}>
              <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: isDarkMode ? '#7F1D1D' : '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                <Ionicons name="trash" size={20} color="#EF4444" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#EF4444' }}>{TEXTS.delete}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ marginTop: 15, padding: 14, alignItems: 'center' }} onPress={onClose}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: subColor }}>{TEXTS.cancel}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const SortModal = ({ visible, onClose, setSortMode, sortMode, activeTheme, isDarkMode }: any) => {
  const bgColor = isDarkMode ? '#1E293B' : '#FFFFFF';
  const textColor = isDarkMode ? '#F1F5F9' : '#1E293B';
  const subColor = isDarkMode ? '#94A3B8' : '#64748B';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={onClose} activeOpacity={1}>
        <View style={{ width: '85%', backgroundColor: bgColor, padding: 24, borderRadius: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor, textAlign: 'center', marginBottom: 15 }}>{TEXTS.sort_by}</Text>
          {[
            { key: 'date', icon: 'calendar-outline', label: TEXTS.sort_date },
            { key: 'name', icon: 'text-outline', label: TEXTS.sort_name },
            { key: 'amount', icon: 'wallet-outline', label: TEXTS.sort_amount },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => { setSortMode(item.key); onClose(); }}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12, backgroundColor: sortMode === item.key ? activeTheme.secondary : 'transparent' }}
            >
              <Ionicons name={item.icon as any} size={20} color={sortMode === item.key ? activeTheme.primary : subColor} />
              <Text style={{ flex: 1, fontSize: 15, color: sortMode === item.key ? activeTheme.primary : textColor, fontWeight: sortMode === item.key ? '700' : '500' }}>{item.label}</Text>
              {sortMode === item.key && <Ionicons name="checkmark" size={20} color={activeTheme.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function Home() {
  const { currentTheme, setTheme, activeTheme, isDarkMode, toggleDarkMode, getStyles } = useTheme();
  const { currency } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(styles);

  const [achats, setAchats] = useState<Achat[]>([]);
  const [filteredAchats, setFilteredAchats] = useState<Achat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortMode, setSortMode] = useState<'date' | 'name' | 'amount'>('date');
  const [activeTab, setActiveTab] = useState<'ongoing' | 'history'>('ongoing');
  const [showSettings, setShowSettings] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [selectedAchat, setSelectedAchat] = useState<Achat | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for recording
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening]);

  // Voice listener
  useEffect(() => {
      if (VoiceService.isVoiceAvailable()) {
          VoiceService.addResultListener((results) => {
               if (results && results.length > 0) {
                   setNewListName(results[0]);
                   setIsListening(false);
                   VoiceService.stopListening();
               }
          });
          return () => {
              VoiceService.stopListening();
          }
      }
  }, []);

  const toggleListening = async () => {
      try {
          if (isListening) {
              await VoiceService.stopListening();
              setIsListening(false);
          } else {
              const started = await VoiceService.startListening();
              if (started) setIsListening(true);
              else Alert.alert("Erreur", "Impossible de démarrer la reconnaissance vocale");
          }
      } catch (e) {
          console.error(e);
          setIsListening(false);
      }
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyAchats = achats.filter(a => { const d = new Date(a.dateAchat); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; });
  const monthlyExpenses = monthlyAchats.reduce((acc, item) => acc + item.totalDepense, 0);
  const monthlyArticlesCount = monthlyAchats.reduce((acc, item) => acc + item.nombreArticles, 0);
  const monthName = format(new Date(), 'MMMM', { locale: fr });

  const ensureSchema = (db: any) => {
    try {
      const info = db.getAllSync("PRAGMA table_info(ListeAchat)");
      const hasStatut = info.some((col: any) => col.name === 'statut');
      if (!hasStatut) db.runSync("ALTER TABLE ListeAchat ADD COLUMN statut INTEGER DEFAULT 0");
    } catch (e) { console.log("Schema check error", e); }
  };

  const loadData = useCallback(() => {
    try {
      const db = getDb();
      ensureSchema(db);
      db.runSync(`DELETE FROM ListeAchat WHERE (nomListe = 'Nouvelle Liste' OR nomListe = '' OR nomListe IS NULL) AND idListe NOT IN (SELECT DISTINCT idListeAchat FROM Article)`);
      const result = db.getAllSync(`SELECT a.idListe as idAchat, a.nomListe, a.dateAchat, a.statut, COALESCE(SUM(l.prixTotal), 0) as totalDepense, COUNT(l.idArticle) as nombreArticles FROM ListeAchat a LEFT JOIN Article l ON a.idListe = l.idListeAchat GROUP BY a.idListe ORDER BY a.dateAchat DESC`);
      if (NotifService.getUnreadNotificationCount) setUnreadCount(NotifService.getUnreadNotificationCount());
      let sorted = [...(result as Achat[])];
      if (sortMode === 'name') sorted.sort((a, b) => (a.nomListe || '').localeCompare(b.nomListe || ''));
      else if (sortMode === 'amount') sorted.sort((a, b) => b.totalDepense - a.totalDepense);
      else sorted.sort((a, b) => new Date(b.dateAchat).getTime() - new Date(a.dateAchat).getTime());
      setAchats(sorted);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e) { console.error(e); }
  }, [sortMode]);

  // Init Notifications
  useEffect(() => {
     NotifService.initNotificationService();
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    let filtered = achats;
    if (searchQuery !== '') filtered = filtered.filter(a => (a.nomListe || '').toLowerCase().includes(searchQuery.toLowerCase()));
    if (activeTab === 'ongoing') filtered = filtered.filter(a => (a.statut === 0 || a.statut === null));
    else filtered = filtered.filter(a => a.statut === 1);
    setFilteredAchats(filtered);
  }, [searchQuery, achats, activeTab]);

  const handleCreate = () => {
    try {
      const db = getDb();
      const defaultTitle = `Nouvelle Liste`;
      const res = db.runSync('INSERT INTO ListeAchat (nomListe, dateAchat, statut) VALUES (?, ?, 0)', [defaultTitle, new Date().toISOString()]);
      router.push({ pathname: `/achat/${res.lastInsertRowId}`, params: { isNew: '1' } });
    } catch (e) { 
      console.error(e);
      Alert.alert('Erreur', 'Impossible de créer la liste');
    }
  };

  const handleOpenList = (item: any) => {
    router.push({ pathname: `/achat/${item.id || item.idAchat}`, params: { readOnly: item.statut === 1 ? '1' : '0' } });
  };

  const toggleStatus = () => {
    if (!selectedAchat) return;
    Alert.alert(TEXTS.check_prices_title, TEXTS.check_prices_msg, [
      { text: TEXTS.cancel, style: "cancel" },
      { text: TEXTS.confirm, onPress: () => {
        try { getDb().runSync('UPDATE ListeAchat SET statut = 1 WHERE idListe = ?', [selectedAchat.idAchat]); setShowActions(false); loadData(); Alert.alert(TEXTS.done, TEXTS.list_archived); } catch (e) { console.error(e); }
      }}
    ]);
  };

  const handleRename = () => {
    if (!selectedAchat || selectedAchat.statut === 1) return;
    setNewListName(selectedAchat.nomListe || '');
    setShowActions(false);
    setTimeout(() => setRenameModal(true), 300);
  };

  const confirmRename = () => {
    if (!selectedAchat || !newListName.trim()) return;
    try { getDb().runSync('UPDATE ListeAchat SET nomListe = ? WHERE idListe = ?', [newListName.trim(), selectedAchat.idAchat]); setRenameModal(false); setNewListName(''); loadData(); } catch (e) { console.error(e); }
  };

  const handleDelete = () => { setShowActions(false); setTimeout(() => setDeleteModal(true), 300); };

  const confirmDelete = () => {
    if (!selectedAchat) return;
    try { getDb().runSync('DELETE FROM Article WHERE idListeAchat = ?', [selectedAchat.idAchat]); getDb().runSync('DELETE FROM ListeAchat WHERE idListe = ?', [selectedAchat.idAchat]); setDeleteModal(false); loadData(); } catch (e) { console.error(e); }
  };

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      
      {/* Header avec gradient */}
      <LinearGradient 
        colors={(activeTheme?.gradient && activeTheme.gradient.length >= 2 ? activeTheme.gradient : ['#7C3AED', '#A855F7']) as [string, string, ...string[]]} 
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.headerTop}>
          {/* ✅ HEADER LOGO PROFESSIONNEL */}
          <HeaderLogo size={52} />
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.iconBtn} onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {unreadCount > 0 && <View style={s.badge}><Text style={s.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={() => setShowSettings(true)}>
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={20} color="rgba(255,255,255,0.7)" />
          <TextInput 
            style={s.searchInput} 
            placeholder={TEXTS.search} 
            placeholderTextColor="rgba(255,255,255,0.6)" 
            value={searchQuery} 
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              if (!searchQuery.trim()) {
                setIsSearchFocused(false);
              }
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setIsSearchFocused(false);
            }}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>

        <View style={s.tabContainer}>
          <TouchableOpacity style={[s.tabBtn, activeTab === 'ongoing' && s.tabActive]} onPress={() => setActiveTab('ongoing')}>
            <Ionicons name="cart-outline" size={16} color={activeTab === 'ongoing' ? activeTheme.primary : 'rgba(255,255,255,0.7)'} style={{ marginRight: 6 }} />
            <Text style={[s.tabText, activeTab === 'ongoing' && { color: activeTheme.primary, fontWeight: '700' }]}>{TEXTS.ongoing}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tabBtn, activeTab === 'history' && s.tabActive]} onPress={() => setActiveTab('history')}>
            <Ionicons name="checkmark-circle-outline" size={16} color={activeTab === 'history' ? activeTheme.primary : 'rgba(255,255,255,0.7)'} style={{ marginRight: 6 }} />
            <Text style={[s.tabText, activeTab === 'history' && { color: activeTheme.primary, fontWeight: '700' }]}>{TEXTS.history}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* CARD SUMMARY */}
      <View style={{ paddingHorizontal: 20, marginTop: -35, marginBottom: 15, zIndex: 20 }}>
        <View style={s.summaryCard}>
          <View style={{ alignItems: 'center', marginBottom: 8 }}>
            <Text style={s.summaryCardTitle}>{TEXTS.monthly_summary} • {monthName}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={s.summaryLabel}>{TEXTS.expenses}</Text>
              <Text style={[s.summaryValue, { color: activeTheme.primary }]}>
                {formatMoney(monthlyExpenses)} {currency}
              </Text>
            </View>
            
            <View style={s.verticalDivider} />
            
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={s.summaryLabel}>{TEXTS.articles}</Text>
              <Text style={[s.summaryValue, { color: activeTheme.primary }]}>
                {monthlyArticlesCount}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={s.content}>
        <View style={s.controlBar}>
          <Text style={s.sectionTitle}>{activeTab === 'ongoing' ? TEXTS.list_ongoing_title : TEXTS.list_history_title}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={s.outlineBtn} onPress={() => setShowSort(true)}><Ionicons name="swap-vertical-outline" size={18} color={s.textSec.color} /></TouchableOpacity>
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
                <AchatCard key={item.idAchat} item={item} viewMode={viewMode} activeTheme={activeTheme} currency={currency} isDarkMode={isDarkMode} onPress={() => handleOpenList(item)} onAction={() => { setSelectedAchat(item); setShowActions(true); }} />
              ))}
            </View>
          ) : (
            <View style={s.emptyState}>
              <View style={[s.emptyIcon, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                <Ionicons name={activeTab === 'ongoing' ? "basket-outline" : "checkmark-done-circle-outline"} size={50} color={s.textSec.color} />
              </View>
              <Text style={s.emptyTitle}>{activeTab === 'ongoing' ? TEXTS.empty_ongoing : TEXTS.empty_history}</Text>
              {activeTab === 'ongoing' && <Text style={s.emptySubtitle}>Appuyez sur + pour créer une liste</Text>}
            </View>
          )}
        </Animated.ScrollView>
      </View>

      {/* Navbar - Cachée pendant la recherche */}
      {!isSearchFocused && (
        <View style={[s.navbar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10, height: 60 + (insets.bottom > 0 ? insets.bottom : 10) }]}>
          <TouchableOpacity style={s.navItem} onPress={loadData}><Ionicons name="home" size={24} color={activeTheme.primary} /><Text style={[s.navText, { color: activeTheme.primary }]}>{TEXTS.welcome}</Text></TouchableOpacity>
          <View style={{ top: -25 }}><TouchableOpacity style={[s.fab, { shadowColor: activeTheme.primary }]} onPress={handleCreate} activeOpacity={0.8}><LinearGradient colors={(activeTheme?.gradient && activeTheme.gradient.length >= 2 ? activeTheme.gradient : ['#7C3AED', '#A855F7']) as [string, string, ...string[]]} style={s.fabGradient}><Ionicons name="add" size={32} color="#fff" /></LinearGradient></TouchableOpacity></View>
          <TouchableOpacity style={s.navItem} onPress={() => router.push('/rapports')}><Ionicons name="pie-chart-outline" size={24} color={s.textSec.color} /><Text style={[s.navText, { color: s.textSec.color }]}>{TEXTS.reports}</Text></TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      <>
        <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} currentTheme={currentTheme} setTheme={setTheme} setShowHelp={setShowHelp} activeTheme={activeTheme} />
        <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} activeTheme={activeTheme} isDarkMode={isDarkMode} />
        <SortModal visible={showSort} onClose={() => setShowSort(false)} setSortMode={setSortMode} sortMode={sortMode} activeTheme={activeTheme} isDarkMode={isDarkMode} />
        <ActionsModal visible={showActions} onClose={() => setShowActions(false)} selectedAchat={selectedAchat} handleRename={handleRename} handleDelete={handleDelete} toggleStatus={toggleStatus} activeTheme={activeTheme} isDarkMode={isDarkMode} />
        <BeautifulConfirmModal visible={deleteModal} title={TEXTS.delete_title} message={`${TEXTS.delete_msg} "${selectedAchat?.nomListe || 'cette liste'}"`} onConfirm={confirmDelete} onCancel={() => setDeleteModal(false)} confirmText={TEXTS.delete} cancelText={TEXTS.cancel} activeTheme={activeTheme} isDarkMode={isDarkMode} type="danger" />

        {/* Rename Modal */}
        <Modal visible={renameModal} transparent animationType="fade" onRequestClose={() => setRenameModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setRenameModal(false)} activeOpacity={1}>
          <View style={[s.modalCard, { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' }]}>
            <Text style={[s.modalTitle, { color: isDarkMode ? '#F1F5F9' : '#1E293B' }]}>{TEXTS.rename}</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TextInput style={[s.simpleInput, { flex: 1, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', color: isDarkMode ? '#F1F5F9' : '#1E293B', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]} value={newListName} onChangeText={setNewListName} autoFocus placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'} placeholder="Nom de la liste" />
              <TouchableOpacity
                onPress={toggleListening}
                style={{
                  width: 50, height: 50, borderRadius: 14,
                  backgroundColor: isListening ? '#FEE2E2' : (isDarkMode ? '#334155' : '#F1F5F9'),
                  justifyContent: 'center', alignItems: 'center',
                  marginTop: 0,
                  borderWidth: 1,
                  borderColor: isListening ? '#EF4444' : (isDarkMode ? '#475569' : '#E2E8F0')
                }}
              >
                  <Animated.View style={{ transform: [{ scale: isListening ? pulseAnim : 1 }] }}>
                    <Ionicons name={isListening ? "mic" : "mic-outline"} size={24} color={isListening ? "#EF4444" : activeTheme.primary} />
                  </Animated.View>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
              <TouchableOpacity onPress={() => setRenameModal(false)} style={[s.btnCancel, { borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}><Text style={[s.btnCancelText, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>{TEXTS.cancel}</Text></TouchableOpacity>
              <TouchableOpacity onPress={confirmRename} style={[s.btnConfirm, { backgroundColor: activeTheme.primary }]}><Text style={s.btnConfirmText}>{TEXTS.save}</Text></TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      </>
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  text: { color: c.text },
  textSec: { color: c.textSec },
  border: { borderColor: c.border },
  bg: { backgroundColor: c.bg },
  container: { flex: 1, backgroundColor: c.bg },
  header: { paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, position: 'relative', overflow: 'hidden' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, zIndex: 10 },
  iconBtn: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  badge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', paddingHorizontal: 3 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16, height: 50, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', zIndex: 10 },
  searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 15 },
  tabContainer: { flexDirection: 'row', marginTop: 15, backgroundColor: 'rgba(0,0,0,0.15)', padding: 4, borderRadius: 14, marginHorizontal: 10, zIndex: 10 },
  tabBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', elevation: 3 },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  
  summaryCard: { 
    backgroundColor: c.card, 
    borderRadius: 18, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    elevation: 8, 
    borderWidth: 1, 
    borderColor: c.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryLabel: { 
    color: c.textSec, 
    fontSize: 10, 
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase'
  },
  summaryValue: { 
    fontSize: 18, 
    fontWeight: '800', 
  },
  verticalDivider: { 
    width: 1, 
    backgroundColor: c.border, 
    height: '60%', 
    marginHorizontal: 10,
  },
  
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 5 },
  controlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text },
  outlineBtn: { width: 42, height: 42, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: c.border, borderRadius: 12, backgroundColor: c.card },
  viewToggle: { flexDirection: 'row', borderWidth: 1.5, borderColor: c.border, borderRadius: 12, backgroundColor: c.card, overflow: 'hidden' },
  toggleBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: c.border },
  list: {},
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: c.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: c.textSec, marginTop: 8, textAlign: 'center' },
  navbar: { flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 1, borderColor: c.border, justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 20, position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  fab: { width: 58, height: 58, borderRadius: 29, shadowOpacity: 0.35, shadowRadius: 8, elevation: 8 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 29, justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '85%', padding: 24, borderRadius: 24, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  simpleInput: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, marginVertical: 15 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  btnConfirm: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnCancelText: { fontWeight: '600' },
  btnConfirmText: { color: '#fff', fontWeight: 'bold' },
});