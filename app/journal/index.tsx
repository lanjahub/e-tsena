import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { useTheme } from '../../src/context/ThemeContext';
import { ThemedStatusBar } from '../../src/components/ThemedStatusBar';
import { useSettings } from '../../src/context/SettingsContext';
import WeekCalendarCircles from '../../src/components/WeekCalendarCircles';
import DayHeroCard from '../../src/components/DayHeroCard';
import TrendMetrics from '../../src/components/TrendMetrics';
import { EmptyState } from '../../src/components/EmptyState';
import {
  JournalService,
  WeekDayData,
  DayData,
  JournalList,
} from '../../src/services/journalService';
import { ComparisonService } from '../../src/services/comparisonService';
import formatMoney from '../../src/utils/formatMoney';
import { debugDatabase } from '../../src/utils/debugDb';

export default function JournalScreen() {
  const { activeTheme, isDarkMode } = useTheme();
  const { currency, language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => getStyles(activeTheme, isDarkMode), [activeTheme, isDarkMode]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekData, setWeekData] = useState<WeekDayData[]>([]);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [weekStats, setWeekStats] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [allLists, setAllLists] = useState<JournalList[]>([]);
  const [showAllLists, setShowAllLists] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log('========== JOURNAL LOADING ==========');
      
      // DEBUG: Vérifier la base de données
      const dbInfo = debugDatabase();
      console.log('[JOURNAL] DB Info:', dbInfo?.listeCount, 'listes,', dbInfo?.articleCount, 'articles');

      // Charger les données de la semaine
      const week = await JournalService.getCurrentWeekData();
      setWeekData(week);

      // Charger les stats de la semaine
      const stats = await JournalService.getWeekStats();
      setWeekStats(stats);

      // Charger TOUTES les listes (pour affichage si aucune donnée du jour)
      const all = await JournalService.getAllLists();
      setAllLists(all);
      console.log('[JOURNAL] All lists loaded:', all.length);

      // Charger les données du jour sélectionné
      await loadDayData(selectedDate);
      
      console.log('=====================================');
    } catch (error) {
      console.error('[JOURNAL] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDayData = async (date: Date) => {
    try {
      const day = await JournalService.getDayData(date);
      setDayData(day);

      const comparison = await JournalService.compareWithYesterday(date);
      setComparisonData(comparison);

      const avg = weekStats?.avg || comparison.weekTotal / 7;
      const eval_ = ComparisonService.evaluatePerformance(day.totalAmount, avg);
      setEvaluation(eval_);
    } catch (error) {
      console.error('[JOURNAL] Error loading day data:', error);
    }
  };

  const generateDailyPDF = async () => {
    const listsToExport = showAllLists ? allLists : (dayData?.lists || []);
    if (listsToExport.length === 0) {
      Alert.alert('Info', 'Aucune liste à exporter');
      return;
    }

    const dateStr = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
    const total = listsToExport.reduce((sum, l) => sum + l.amount, 0);
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid ${activeTheme.primary}; padding-bottom: 20px; }
            .title { font-size: 28px; color: ${activeTheme.primary}; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background: ${activeTheme.primary}; color: white; padding: 14px; text-align: left; }
            td { padding: 14px; border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .total-row { background: #f0f0f0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title"> Journal E-Tsena</h1>
            <p>${showAllLists ? 'Toutes les listes' : dateStr}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Liste</th>
                <th>Date</th>
                <th class="text-right">Articles</th>
                <th class="text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              ${listsToExport.map(l => `
                <tr>
                  <td>${l.name}</td>
                  <td>${l.dateAchat ? l.dateAchat.split(' ')[0] : '-'}</td>
                  <td class="text-right">${l.itemCount}</td>
                  <td class="text-right">${formatMoney(l.amount)} ${currency}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3">TOTAL</td>
                <td class="text-right">${formatMoney(total)} ${currency}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    }
  };

  const handleDayPress = useCallback(async (day: WeekDayData) => {
    setSelectedDate(day.date);
    setShowAllLists(false);
    await loadDayData(day.date);
  }, [weekStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  const renderListItem = ({ item }: { item: JournalList }) => (
    <TouchableOpacity
      style={s.purchaseCard}
      onPress={() => router.push(`/achat/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={s.purchaseIconContainer}>
        <View style={[s.purchaseIcon, { backgroundColor: activeTheme.primary + '20' }]}>
          <Ionicons name="cart" size={20} color={activeTheme.primary} />
        </View>
      </View>
      <View style={s.purchaseInfo}>
        <Text style={s.purchaseName} numberOfLines={1}>{item.name}</Text>
        <View style={s.purchaseDetails}>
          <Text style={s.purchaseTime}>{item.itemCount} articles</Text>
          {item.dateAchat && (
            <>
              <Text style={s.purchaseDot}>•</Text>
              <Text style={s.purchaseTime}>{item.dateAchat.split(' ')[0]}</Text>
            </>
          )}
        </View>
      </View>
      <View style={s.purchaseAmountContainer}>
        <Text style={s.purchaseAmount}>{formatMoney(item.amount)}</Text>
        <Text style={s.purchaseCurrency}>{currency}</Text>
      </View>
    </TouchableOpacity>
  );

  const listsToShow = showAllLists ? allLists : (dayData?.lists || []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={activeTheme.primary} />
        <Text style={{ color: isDarkMode ? '#94A3B8' : '#64748B', marginTop: 10 }}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />

      <LinearGradient
        colors={activeTheme.gradient as [string, string, ...string[]]}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.push('/')}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
        >
          <Ionicons name="home-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginLeft: 5 }}>
            Accueil
          </Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Journal</Text>
        </TouchableOpacity>

        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}> Journal</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={generateDailyPDF} style={s.iconBtn}>
              <Ionicons name="download-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/statistiques')} style={s.iconBtn}>
              <Ionicons name="stats-chart-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.headerSubtitle}>
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </Text>
      </LinearGradient>

      <Animated.ScrollView
        style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[activeTheme.primary]}
          />
        }
      >
        {/* CALENDRIER SEMAINE */}
        <View style={s.card}>
          <WeekCalendarCircles
            data={weekData}
            onDayPress={handleDayPress}
            activeTheme={activeTheme}
            isDarkMode={isDarkMode}
            selectedDay={weekData.find(d => format(d.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))}
          />
        </View>

        {/* HERO CARD */}
        {dayData && evaluation && comparisonData && (
          <DayHeroCard
            date={selectedDate}
            totalAmount={showAllLists ? allLists.reduce((s, l) => s + l.amount, 0) : dayData.totalAmount}
            evaluation={evaluation}
            purchaseCount={showAllLists ? allLists.length : dayData.listCount}
            vsYesterday={comparisonData.vsYesterday}
            activeTheme={activeTheme}
            isDarkMode={isDarkMode}
            currency={currency}
          />
        )}

        {/* MÉTRIQUES */}
        {comparisonData && weekStats && (
          <View style={s.card}>
            <Text style={s.cardTitle}> Comparaisons</Text>
            <TrendMetrics
              metrics={[
                {
                  label: 'Vs Hier',
                  value: Math.abs(comparisonData.vsYesterday.difference),
                  trend: comparisonData.vsYesterday.trend,
                  change: `${comparisonData.vsYesterday.percentage >= 0 ? '+' : ''}${comparisonData.vsYesterday.percentage.toFixed(0)}%`,
                  icon: 'calendar-outline',
                  suffix: currency,
                },
                {
                  label: 'Vs Moyenne',
                  value: Math.abs(comparisonData.vsAverage.difference),
                  trend: comparisonData.vsAverage.trend,
                  change: `${comparisonData.vsAverage.percentage >= 0 ? '+' : ''}${comparisonData.vsAverage.percentage.toFixed(0)}%`,
                  icon: 'analytics-outline',
                  suffix: currency,
                },
                {
                  label: 'Total Semaine',
                  value: comparisonData.weekTotal,
                  trend: 'stable',
                  icon: 'wallet-outline',
                  suffix: currency,
                },
              ]}
              activeTheme={activeTheme}
              isDarkMode={isDarkMode}
            />
          </View>
        )}

        {/* TOGGLE: Jour / Toutes les listes */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>
               {showAllLists ? 'Toutes les listes' : 'Listes du jour'} ({listsToShow.length})
            </Text>
            <TouchableOpacity onPress={() => setShowAllLists(!showAllLists)}>
              <Text style={[s.linkText, { color: activeTheme.primary }]}>
                {showAllLists ? 'Voir jour' : 'Voir tout'}
              </Text>
            </TouchableOpacity>
          </View>

          {listsToShow.length > 0 ? (
            <FlatList
              data={listsToShow}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderListItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          ) : (
            <EmptyState
              title="Aucune liste"
              icon="calendar-outline"
              message={showAllLists ? "Aucune liste dans la base de données" : "Aucune liste pour cette date"}
            />
          )}
        </View>

        {/* DEBUG INFO */}
        {/* <View style={[s.card, { backgroundColor: isDarkMode ? '#1a1a2e' : '#fff3cd' }]}>
          <Text style={[s.cardTitle, { color: '#856404' }]}>🔧 Debug Info</Text>
          <Text style={{ color: isDarkMode ? '#ffc107' : '#856404', fontSize: 12 }}>
            • Listes totales: {allLists.length}{'\n'}
            • Listes du jour: {dayData?.listCount || 0}{'\n'}
            • Date sélectionnée: {format(selectedDate, 'yyyy-MM-dd')}{'\n'}
            • Total semaine: {formatMoney(weekStats?.total || 0)} {currency}
          </Text>
        </View> */}

        {/* BOUTON STATISTIQUES */}
        <TouchableOpacity
          style={[s.statsButton, { backgroundColor: isDarkMode ? '#1E293B' : '#fff' }]}
          onPress={() => router.push('/statistiques')}
        >
          <View style={[s.statsButtonIcon, { backgroundColor: activeTheme.primary + '20' }]}>
            <Ionicons name="stats-chart" size={24} color={activeTheme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.statsButtonTitle}>Voir les statistiques détaillées</Text>
            <Text style={s.statsButtonSubtitle}>Analyses et tendances</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={activeTheme.primary} />
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

const getStyles = (theme: any, dark: boolean) => {
  const c = {
    bg: dark ? '#0F172A' : '#F8FAFC',
    card: dark ? '#1E293B' : '#fff',
    text: dark ? '#F1F5F9' : '#1E293B',
    textSec: dark ? '#94A3B8' : '#64748B',
  };

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
    header: { paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textTransform: 'capitalize' },
    iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    content: { flex: 1, paddingHorizontal: 20, marginTop: 20 },
    card: { backgroundColor: c.card, borderRadius: 20, padding: 20, marginBottom: 20, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    linkText: { fontSize: 14, fontWeight: '600' },
    purchaseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: dark ? '#0F172A' : '#F8FAFC', padding: 14, borderRadius: 14 },
    purchaseIconContainer: { marginRight: 12 },
    purchaseIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    purchaseInfo: { flex: 1 },
    purchaseName: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 },
    purchaseDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    purchaseTime: { fontSize: 12, color: c.textSec },
    purchaseDot: { fontSize: 12, color: c.textSec },
    purchaseAmountContainer: { alignItems: 'flex-end' },
    purchaseAmount: { fontSize: 18, fontWeight: '800', color: theme.primary },
    purchaseCurrency: { fontSize: 11, color: c.textSec },
    statsButton: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 20, elevation: 3 },
    statsButtonIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    statsButtonTitle: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 4 },
    statsButtonSubtitle: { fontSize: 13, color: c.textSec },
  });
};