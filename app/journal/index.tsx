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
import { format, subDays } from 'date-fns';
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
  Purchase,
} from '../../src/services/journalService';
import { ComparisonService } from '../../src/services/comparisonService';
import formatMoney from '../../src/utils/formatMoney';

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

  // Animations
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
      // Charger les données de la semaine
      const week = await JournalService.getCurrentWeekData();
      setWeekData(week);

      // Charger les stats de la semaine
      const stats = await JournalService.getWeekStats();
      setWeekStats(stats);

      // Charger les données du jour sélectionné
      await loadDayData(selectedDate);
    } catch (error) {
      console.error('[JOURNAL] Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDayData = async (date: Date) => {
    try {
      // Données du jour
      const day = await JournalService.getDayData(date);
      setDayData(day);

      // Comparaisons
      const comparison = await JournalService.compareWithYesterday(date);
      setComparisonData(comparison);

      // Évaluation
      const avg = weekStats?.avg || comparison.weekTotal / 7;
      const evaluation = ComparisonService.evaluatePerformance(day.totalAmount, avg);
      setEvaluation(evaluation);
    } catch (error) {
      console.error('[JOURNAL] Erreur lors du chargement du jour:', error);
    }
  };

  const generateDailyPDF = async () => {
    if (!dayData || dayData.purchases.length === 0) {
      Alert.alert(t('info'), t('no_purchase') || 'Aucun achat à exporter');
      return;
    }

    const dateStr = format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica', sans-serif; padding: 40px; background: #fff; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid ${activeTheme.primary}; padding-bottom: 20px; }
            .title { font-size: 28px; color: ${activeTheme.primary}; margin: 0; font-weight: bold; }
            .date { font-size: 16px; color: #666; margin-top: 10px; text-transform: capitalize; }
            .summary { display: flex; justify-content: space-around; margin: 25px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; }
            .summary-item { text-align: center; }
            .summary-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
            .summary-value { font-size: 24px; font-weight: bold; color: ${activeTheme.primary}; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 25px; }
            th { background: ${activeTheme.primary}; color: white; padding: 14px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            th:first-child { border-radius: 8px 0 0 0; }
            th:last-child { border-radius: 0 8px 0 0; }
            td { padding: 14px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
            tr:nth-child(even) { background: #f8f9fa; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { background: ${activeTheme.primary}15 !important; font-weight: bold; font-size: 16px; }
            .total-row td { border-top: 2px solid ${activeTheme.primary}; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; padding-top: 20px; border-top: 1px solid #eee; }
            .logo { font-size: 18px; font-weight: bold; color: ${activeTheme.primary}; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">📖 Journal des Dépenses</h1>
            <p class="date">${dateStr}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Dépensé</div>
              <div class="summary-value">${formatMoney(dayData.totalAmount)} ${currency}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Nombre d'Achats</div>
              <div class="summary-value">${dayData.purchases.length}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 10%">Heure</th>
                <th style="width: 40%">Produit</th>
                <th class="text-center" style="width: 20%">Quantité</th>
                <th class="text-right" style="width: 30%">Prix</th>
              </tr>
            </thead>
            <tbody>
              ${dayData.purchases.map(p => `
                <tr>
                  <td>${p.heureAchat}</td>
                  <td>${p.libelleProduit}</td>
                  <td class="text-center">${p.quantite}</td>
                  <td class="text-right">${formatMoney(p.montant || 0)} ${currency}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>TOTAL</strong></td>
                <td class="text-right"><strong>${formatMoney(dayData.totalAmount)} ${currency}</strong></td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <div class="logo">E-TSENA</div>
            Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      console.error(e);
      Alert.alert(t('error'), t('pdf_error') || 'Impossible de générer le PDF');
    }
  };

  const handleDayPress = useCallback(
    async (day: WeekDayData) => {
      setSelectedDate(day.date);
      await loadDayData(day.date);
    },
    [weekStats]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  const navigateToStatistics = () => {
    router.push('/statistiques');
  };

  const navigateToPurchaseDetail = (purchase: Purchase) => {
    router.push(`/achat/${purchase.id}`);
  };

  const renderPurchaseItem = ({ item }: { item: Purchase }) => (
    <TouchableOpacity
      style={s.purchaseCard}
      onPress={() => navigateToPurchaseDetail(item)}
      activeOpacity={0.7}
    >
      <View style={s.purchaseIconContainer}>
        <View style={[s.purchaseIcon, { backgroundColor: activeTheme.primary + '20' }]}>
          <Ionicons name="cube" size={20} color={activeTheme.primary} />
        </View>
      </View>

      <View style={s.purchaseInfo}>
        <Text style={s.purchaseName} numberOfLines={1}>
          {item.libelleProduit}
        </Text>
        <View style={s.purchaseDetails}>
          <Ionicons name="time-outline" size={12} color={isDarkMode ? '#94A3B8' : '#64748B'} />
          <Text style={s.purchaseTime}>{item.heureAchat}</Text>
          <Text style={s.purchaseDot}>•</Text>
          <Text style={s.purchaseQuantity}>
            Qté: {item.quantite} × {formatMoney(item.prixUnitaire)} {currency}
          </Text>
        </View>
      </View>

      <View style={s.purchaseAmountContainer}>
        <Text style={s.purchaseAmount}>
          {formatMoney(item.montant)}
        </Text>
        <Text style={s.purchaseCurrency}>{currency}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={activeTheme.primary} />
        <Text style={{ color: isDarkMode ? '#94A3B8' : '#64748B', marginTop: 10 }}>
          {t('loading') || 'Chargement...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />

      {/* HEADER */}
      <LinearGradient
        colors={activeTheme.gradient as [string, string, ...string[]]}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity
          onPress={() => router.push('/')}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, opacity: 0.9 }}
        >
          <Ionicons name="home-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginLeft: 5 }}>
            {t('home') || 'Accueil'}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color="rgba(255,255,255,0.8)"
            style={{ marginHorizontal: 4 }}
          />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
            {t('journal') || 'Journal'}
          </Text>
        </TouchableOpacity>

        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('journal') || '📖 Journal'}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity 
              onPress={generateDailyPDF} 
              style={[s.iconBtn, { opacity: !dayData || dayData.purchases.length === 0 ? 0.5 : 1 }]}
              disabled={!dayData || dayData.purchases.length === 0}
            >
              <Ionicons name="download-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={navigateToStatistics} style={s.iconBtn}>
              <Ionicons name="stats-chart-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.headerSubtitle}>
          {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </Text>
      </LinearGradient>

      {/* CONTENT */}
      <Animated.ScrollView
        style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[activeTheme.primary]}
            tintColor={activeTheme.primary}
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

        {/* HERO CARD DU JOUR */}
        {dayData && evaluation && comparisonData && (
          <DayHeroCard
            date={selectedDate}
            totalAmount={dayData.totalAmount}
            evaluation={evaluation}
            purchaseCount={dayData.purchaseCount}
            vsYesterday={comparisonData.vsYesterday}
            areaChartData={dayData.hourlyDistribution}
            activeTheme={activeTheme}
            isDarkMode={isDarkMode}
            currency={currency}
          />
        )}

        {/* MÉTRIQUES COMPARATIVES */}
        {comparisonData && weekStats && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📊 {t('comparisons') || 'Comparaisons'}</Text>
            <TrendMetrics
              metrics={[
                {
                  label: t('vs_yesterday') || 'Vs Hier',
                  value: Math.abs(comparisonData.vsYesterday.difference),
                  trend: comparisonData.vsYesterday.trend,
                  change: `${comparisonData.vsYesterday.percentage >= 0 ? '+' : ''}${comparisonData.vsYesterday.percentage.toFixed(0)}%`,
                  icon: 'calendar-outline',
                  suffix: currency,
                },
                {
                  label: t('vs_average') || 'Vs Moyenne',
                  value: Math.abs(comparisonData.vsAverage.difference),
                  trend: comparisonData.vsAverage.trend,
                  change: `${comparisonData.vsAverage.percentage >= 0 ? '+' : ''}${comparisonData.vsAverage.percentage.toFixed(0)}%`,
                  icon: 'analytics-outline',
                  suffix: currency,
                },
                {
                  label: t('week_total') || 'Total Semaine',
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

        {/* LISTE DES ACHATS DU JOUR */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>
              🛒 {t('purchases_today') || 'Achats d\'aujourd\'hui'} ({dayData?.purchaseCount || 0})
            </Text>
            {dayData && dayData.purchaseCount > 0 && (
              <TouchableOpacity onPress={() => router.push('/')}>
                <Text style={[s.linkText, { color: activeTheme.primary }]}>
                  {t('add') || 'Ajouter'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {dayData && dayData.purchases.length > 0 ? (
            <FlatList
              data={dayData.purchases}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderPurchaseItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            />
          ) : (
            <EmptyState
              title={t('no_purchases') || 'Pas d\'achats'}
              icon="cart-outline"
              message={t('no_purchases_today') || 'Aucun achat aujourd\'hui'}
            />
          )}

          {dayData && dayData.purchaseCount === 0 && (
            <TouchableOpacity
              style={[s.addButton, { backgroundColor: activeTheme.primary }]}
              onPress={() => router.push('/')}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={s.addButtonText}>{t('add_first_purchase') || 'Ajouter un achat'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* BOUTON VOIR LES STATISTIQUES */}
        <TouchableOpacity
          style={[s.statsButton, { backgroundColor: isDarkMode ? '#1E293B' : '#fff' }]}
          onPress={navigateToStatistics}
          activeOpacity={0.7}
        >
          <View style={[s.statsButtonIcon, { backgroundColor: activeTheme.primary + '20' }]}>
            <Ionicons name="stats-chart" size={24} color={activeTheme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.statsButtonTitle}>{t('view_detailed_stats') || 'Voir les statistiques détaillées'}</Text>
            <Text style={s.statsButtonSubtitle}>
              {t('analysis_trends') || 'Analyses et tendances complètes'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={activeTheme.primary} />
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

// --- STYLES ---
const getStyles = (theme: any, dark: boolean) => {
  const c = {
    bg: dark ? '#0F172A' : '#F8FAFC',
    card: dark ? '#1E293B' : '#fff',
    text: dark ? '#F1F5F9' : '#1E293B',
    textSec: dark ? '#94A3B8' : '#64748B',
    border: dark ? '#334155' : '#F1F5F9',
  };

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.bg,
    },
    header: {
      paddingBottom: 30,
      paddingHorizontal: 20,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
    headerSubtitle: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      fontWeight: '500',
      textTransform: 'capitalize',
    },
    iconBtn: {
      padding: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 12,
    },
    content: { flex: 1, paddingHorizontal: 20, marginTop: 20 },
    card: {
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: dark ? 0.2 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    linkText: { fontSize: 14, fontWeight: '600' },
    purchaseCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: dark ? '#0F172A' : '#F8FAFC',
      padding: 14,
      borderRadius: 14,
    },
    purchaseIconContainer: { marginRight: 12 },
    purchaseIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    purchaseInfo: { flex: 1 },
    purchaseName: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 },
    purchaseDetails: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    purchaseTime: { fontSize: 12, color: c.textSec },
    purchaseDot: { fontSize: 12, color: c.textSec },
    purchaseQuantity: { fontSize: 12, color: c.textSec },
    purchaseAmountContainer: { alignItems: 'flex-end' },
    purchaseAmount: { fontSize: 18, fontWeight: '800', color: theme.primary },
    purchaseCurrency: { fontSize: 11, color: c.textSec, marginTop: 2 },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 12,
      marginTop: 12,
      gap: 8,
    },
    addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    statsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 18,
      borderRadius: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: dark ? 0.2 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    statsButtonIcon: {
      width: 50,
      height: 50,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    statsButtonTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
      marginBottom: 4,
    },
    statsButtonSubtitle: { fontSize: 13, color: c.textSec },
  });
};
