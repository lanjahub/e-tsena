import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet, 
  Animated, Modal, ActivityIndicator, Alert, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart, LineChart } from 'react-native-chart-kit';
import { DepenseService } from '../../src/services/depenseService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, startOfYear, endOfYear } from 'date-fns';
import formatMoney from '../../src/utils/formatMoney';
import { fr, enUS } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { useTheme } from '../../src/context/ThemeContext';
import { ThemedStatusBar } from '../../src/components/ThemedStatusBar';
import { useSettings } from '../../src/context/SettingsContext';
import JournalModal from '../../src/components/JournalModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- TYPES ---
interface ChartData {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

interface ComparativeData {
  id: string;
  period: string;
  fullLabel: string;
  montant: number;
  nbAchats: number;
  startDate: string;
  endDate: string;
}

interface ProductEntry {
  libelleProduit: string;
  totalQte: number;
  totalPrix: number;
}

type ViewMode = 'repartition' | 'weekly' | 'monthly';

export default function StatsScreen() {
  const { activeTheme, isDarkMode } = useTheme();
  const { currency, language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(activeTheme, isDarkMode);

  // --- ÉTATS ---
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartData[]>([]);
  const [allProducts, setAllProducts] = useState<{ name: string; montant: number }[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showAllProductsModal, setShowAllProductsModal] = useState(false);
  
  const [totalGlobal, setTotalGlobal] = useState(0);
  const [totalYear, setTotalYear] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  
  const [viewMode, setViewMode] = useState<ViewMode>('repartition');
  const [weeklyData, setWeeklyData] = useState<ComparativeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ComparativeData[]>([]);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ComparativeData | null>(null);
  const [journalData, setJournalData] = useState<ProductEntry[]>([]);
  
  const [showMenu, setShowMenu] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleChart = useRef(new Animated.Value(0)).current;
  const rotateChart = useRef(new Animated.Value(0)).current;

  const [filteredTotal, setFilteredTotal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [language, activeTheme])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true })
    ]).start();
  }, [language, activeTheme]); 

  useEffect(() => {
    scaleChart.setValue(0);
    rotateChart.setValue(0);
    
    Animated.parallel([
      Animated.spring(scaleChart, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.timing(rotateChart, { toValue: 1, duration: 1000, useNativeDriver: true })
    ]).start();
  }, [data]);

  const spin = rotateChart.interpolate({
    inputRange: [0, 1],
    outputRange: ['-30deg', '0deg']
  });

  const loadAllData = async () => {
    try {
      const tGlobal = await DepenseService.calculerTotalGlobal();
      setTotalGlobal(tGlobal);

      const startY = format(startOfYear(new Date()), 'yyyy-MM-dd');
      const endY = format(endOfYear(new Date()), 'yyyy-MM-dd');
      const tYear = await DepenseService.getTotalSurPeriode(startY, endY);
      setTotalYear(tYear);

      const startM = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const endM = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const tMonth = await DepenseService.getTotalSurPeriode(startM, endM);
      setTotalMonth(tMonth);

      const allRows = await DepenseService.getRepartitionParProduit();
      setAllProducts(allRows);
      
      if (selectedProducts.length === 0 && allRows.length > 0) {
        const topNames = allRows.slice(0, 5).map(r => r.name);
        setSelectedProducts(topNames);
        updateChartData(allRows, topNames);
      } else {
        updateChartData(allRows, selectedProducts);
      }

      await loadComparative();
    } catch (e) { 
      console.error(e); 
      Alert.alert(t('error'), t('error_loading_stats'));
    } finally { setLoading(false); }
  };

  const updateChartData = (products: { name: string; montant: number }[], selection: string[]) => {
    const filteredRows = products.filter(p => selection.includes(p.name));
    const total = filteredRows.reduce((sum, p) => sum + p.montant, 0);
    setFilteredTotal(total);

    const basePalette = [
      activeTheme.primary,
      activeTheme.secondary,
      '#E53935', '#8E24AA', '#1E88E5', '#43A047', '#FB8C00', '#00897B',
      '#D81B60', '#5E35B1', '#039BE5', '#00ACC1', '#7CB342', '#C0CA33',
      '#3949AB', '#00838F', '#6D4C41', '#546E7A', '#F4511E', '#757575'
    ];

    const generateThemeColors = (count: number) => {
      const colors: string[] = [];
      for (let i = 0; i < count; i++) {
        if (i < basePalette.length) colors.push(basePalette[i]);
        else {
          const hue = (i * 137.508) % 360;
          colors.push(`hsl(${hue}, 70%, 50%)`); 
        }
      }
      return colors;
    };

    const chartColors = generateThemeColors(filteredRows.length);
    
    const chartData = filteredRows.map((r, i) => ({
      name: r.name,
      population: r.montant,
      color: chartColors[i % chartColors.length],
      legendFontColor: isDarkMode ? '#ccc' : '#666',
      legendFontSize: 12
    }));
    
    setData(chartData.length > 0
      ? chartData
      : [{ name: 'Vide', population: 1, color: '#ddd', legendFontColor: '#aaa', legendFontSize: 12 }]
    );
  };

  const toggleProductSelection = (name: string) => {
    let newSelection = [...selectedProducts];
    if (newSelection.includes(name)) {
      newSelection = newSelection.filter(n => n !== name);
    } else newSelection.push(name);
    setSelectedProducts(newSelection);
    updateChartData(allProducts, newSelection);
  };

  const toggleAllProducts = () => {
    if (selectedProducts.length === allProducts.length) {
      setSelectedProducts([]);
      updateChartData(allProducts, []);
    } else {
      const allNames = allProducts.map(p => p.name);
      setSelectedProducts(allNames);
      updateChartData(allProducts, allNames);
    }
  };

  const loadComparative = async () => {
    // 4 dernières semaines
    const weeks: ComparativeData[] = [];
    for (let i = 0; i < 4; i++) {
      const ws = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const we = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const sStr = format(ws, 'yyyy-MM-dd');
      const eStr = format(we, 'yyyy-MM-dd');

      const stats = await DepenseService.getStatsComparatives(sStr, eStr);
      
      weeks.push({
        id: `w-${i}`,
        period: `Sem. ${format(ws, 'dd/MM')}`,
        fullLabel: `Semaine du ${format(ws, 'dd MMM', { locale: language === 'en' ? enUS : fr })} au ${format(we, 'dd MMM', { locale: language === 'en' ? enUS : fr })}`,
        montant: stats.montant,
        nbAchats: stats.nbAchats,
        startDate: sStr,
        endDate: eStr
      });
    }
    setWeeklyData(weeks);

    // 3 derniers mois
    const months: ComparativeData[] = [];
    for (let i = 0; i < 3; i++) {
      const d = subMonths(new Date(), i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const sStr = format(ms, 'yyyy-MM-dd');
      const eStr = format(me, 'yyyy-MM-dd');

      const stats = await DepenseService.getStatsComparatives(sStr, eStr);
      
      months.push({
        id: `m-${i}`,
        period: format(ms, 'MMM', { locale: language === 'en' ? enUS : fr }),
        fullLabel: format(ms, 'MMMM yyyy', { locale: language === 'en' ? enUS : fr }),
        montant: stats.montant,
        nbAchats: stats.nbAchats,
        startDate: sStr,
        endDate: eStr
      });
    }
    setMonthlyData(months);
  };

  const openDetailModal = async (item: ComparativeData) => {
    setSelectedPeriod(item);
    try {
      const res = await DepenseService.getDetailsProduitsSurPeriode(item.startDate, item.endDate);
      setJournalData(res as ProductEntry[]);
      setShowDetailModal(true);
    } catch (e) { console.error(e); }
  };

  const renderProgressBar = (item: ComparativeData, max: number) => {
    const percent = max > 0 ? (item.montant / max) * 100 : 0;
    return (
      <TouchableOpacity 
         key={item.id} 
         onPress={() => openDetailModal(item)}
         style={s.progressContainer}
      >
        <View style={s.progressHeader}>
          <Text style={s.progressLabel}>{item.period}</Text>
          <Text style={s.progressValue}>{formatMoney(item.montant)} {currency}</Text>
        </View>
        <View style={s.track}>
          <LinearGradient
            colors={[activeTheme.primary, activeTheme.secondary]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[s.bar, { width: `${percent}%` }]}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
           <Text style={s.progressSub}>{item.nbAchats} {t('purchase_s')}</Text>
           <Text style={[s.progressSub, { color: activeTheme.primary, fontWeight: 'bold' }]}>{t('see_details')} &gt;</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // DATA POUR LES LINECHARTS
  const locale = language === 'en' ? enUS : fr;

  const getWeeklyLineData = () => {
    if (!weeklyData.length) return null;
    const sorted = [...weeklyData].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return {
      labels: sorted.map(w => format(new Date(w.startDate), 'dd/MM')),
      values: sorted.map(w => w.montant)
    };
  };

  const getMonthlyLineData = () => {
    if (!monthlyData.length) return null;
    const sorted = [...monthlyData].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return {
      labels: sorted.map(m => format(new Date(m.startDate), 'MMM', { locale })),
      values: sorted.map(m => m.montant)
    };
  };

  const lineChartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: isDarkMode ? '#0F172A' : '#F8FAFC',
    backgroundGradientTo: isDarkMode ? '#0F172A' : '#F8FAFC',
    decimalPlaces: 0,
    color: (opacity = 1) => `${activeTheme.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
    labelColor: (opacity = 1) => isDarkMode ? '#E5E7EB' : '#6B7280',
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: activeTheme.secondary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: isDarkMode ? '#1F2937' : '#E5E7EB'
    }
  };

  if (loading) return <ActivityIndicator style={s.center} color={activeTheme.primary} />;

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      
      {/* HEADER */}
      <LinearGradient colors={activeTheme.gradient as any} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          onPress={() => router.push('/')} 
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, opacity: 0.9 }}
        >
          <Ionicons name="home-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginLeft: 5 }}>{t('home')}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" style={{ marginHorizontal: 4 }} />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{t('reports')}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" style={{ marginHorizontal: 4 }} />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{t('statistics')}</Text>
        </TouchableOpacity>

        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.push('/rapports')} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('statistics')}</Text>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={s.iconBtn}>
            <Ionicons name="menu" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('total_spent_month')}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{formatMoney(totalMonth)} {currency}</Text>
          </View>
          <View style={s.verticalDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('total_year')} {new Date().getFullYear()}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{formatMoney(totalYear)} {currency}</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* TABS */}
        <View style={s.tabContainer}>
          {[
            { k: 'repartition', l: t('distribution') },
            { k: 'weekly', l: t('week') },
            { k: 'monthly', l: t('month') }
          ].map(tt => (
            <TouchableOpacity 
               key={tt.k} 
               style={[s.tab, viewMode === tt.k && { backgroundColor: activeTheme.primary + '20' }]}
               onPress={() => setViewMode(tt.k as ViewMode)}
            >
               <Text style={[s.tabText, viewMode === tt.k && { color: activeTheme.primary, fontWeight: 'bold' }]}>{tt.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* RÉPARTITION (Camembert) */}
        {viewMode === 'repartition' && (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <View>
                 <Text style={s.cardTitle}>{t('distribution')}</Text>
                 <Text style={{ fontSize: 12, color: isDarkMode ? '#94A3B8' : '#9CA3AF', marginTop: 2 }}>{data.length} {t('products')}</Text>
               </View>
               <TouchableOpacity onPress={() => setShowAllProductsModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: activeTheme.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                  <Ionicons name="options-outline" size={16} color={activeTheme.primary} />
                  <Text style={{ color: activeTheme.primary, fontWeight: '600', fontSize: 13 }}>{t('filter')}</Text>
               </TouchableOpacity>
            </View>
            
            <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 15 }}>
              <Animated.View style={[{ transform: [{ scale: scaleChart }, { rotate: spin }] }]}>
                <PieChart
                  data={data}
                  width={SCREEN_WIDTH - 60}
                  height={260}
                  chartConfig={{ 
                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  }}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute={false}
                  hasLegend={false}
                  center={[(SCREEN_WIDTH - 60) / 4, 0]}
                />
              </Animated.View>
            </View>
            
            <View style={{ alignItems: 'center', marginBottom: 10, paddingVertical: 12, backgroundColor: isDarkMode ? '#1E293B' : '#F0F9FF', borderRadius: 12 }}>
              <Text style={{ fontSize: 12, color: isDarkMode ? '#94A3B8' : '#6B7280', fontWeight: '600' }}>{t('total')}</Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: activeTheme.primary }}>{formatMoney(filteredTotal)} {currency}</Text>
            </View>

            <View style={s.legendContainerPro}>
              {data.map((item, index) => {
                const percent = filteredTotal > 0 ? Math.round((item.population / filteredTotal) * 100) : 0;
                return (
                  <View key={item.name || index} style={s.legendItemPro}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <View style={[s.colorBar, { backgroundColor: item.color }]} />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.legendNamePro} numberOfLines={1}>{item.name}</Text>
                        <Text style={s.legendAmountPro}>{formatMoney(item.population)} {currency}</Text>
                      </View>
                    </View>
                    <View style={[s.percentBadgePro, { backgroundColor: item.color }]}>
                      <Text style={s.percentTextPro}>{percent}%</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            
            <TouchableOpacity 
              style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: activeTheme.primary, borderRadius: 14, gap: 8 }}
              onPress={() => setShowAllProductsModal(true)}
            >
              <Ionicons name="pie-chart-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{t('manage_display')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SEMAINE (LineChart + liste) */}
        {viewMode === 'weekly' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('last_4_weeks')}</Text>
            <View style={{ marginTop: 15, alignItems: 'center' }}>
              {getWeeklyLineData() ? (
                <LineChart
                  data={{
                    labels: getWeeklyLineData()!.labels,
                    datasets: [{ data: getWeeklyLineData()!.values }]
                  }}
                  width={SCREEN_WIDTH - 60}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={lineChartConfig}
                  bezier
                  style={s.lineChart}
                />
              ) : (
                <Text style={{ color: s.progressSub.color, marginTop: 20 }}>
                  {t('no_data') || 'Pas de données pour ces semaines'}
                </Text>
              )}
            </View>
            <View style={{ marginTop: 15 }}>
              {weeklyData.map(item => 
                renderProgressBar(item, Math.max(...weeklyData.map(i => i.montant)))
              )}
            </View>
          </View>
        )}

        {/* MOIS (LineChart + liste) */}
        {viewMode === 'monthly' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('last_3_months')}</Text>
            <View style={{ marginTop: 15, alignItems: 'center' }}>
              {getMonthlyLineData() ? (
                <LineChart
                  data={{
                    labels: getMonthlyLineData()!.labels,
                    datasets: [{ data: getMonthlyLineData()!.values }]
                  }}
                  width={SCREEN_WIDTH - 60}
                  height={220}
                  yAxisLabel=""
                  yAxisSuffix=""
                  chartConfig={lineChartConfig}
                  bezier
                  style={s.lineChart}
                />
              ) : (
                <Text style={{ color: s.progressSub.color, marginTop: 20 }}>
                  {t('no_data') || 'Pas de données pour ces mois'}
                </Text>
              )}
            </View>
            <View style={{ marginTop: 15 }}>
              {monthlyData.map(item => 
                renderProgressBar(item, Math.max(...monthlyData.map(i => i.montant)))
              )}
            </View>
          </View>
        )}

      </Animated.ScrollView>

      {/* MODALE JOURNAL */}
      <JournalModal
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        selectedPeriod={selectedPeriod}
        journalData={journalData}
        activeTheme={activeTheme}
        isDarkMode={isDarkMode}
        currency={currency}
        t={t}
      />

      {/* MODAL PRODUITS */}
      <Modal 
         visible={showAllProductsModal} 
         animationType="slide" 
         presentationStyle="pageSheet"
         onRequestClose={() => setShowAllProductsModal(false)}
      >
         <View style={{ flex: 1, backgroundColor: isDarkMode ? '#0F172A' : '#fff' }}>
            <View style={{ paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: isDarkMode ? '#1E293B' : '#fff', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#334155' : '#F1F5F9' }}>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => setShowAllProductsModal(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                     <Ionicons name="arrow-back" size={24} color={activeTheme.primary} />
                     <Text style={{ fontSize: 16, fontWeight: '600', color: activeTheme.primary }}>{t('back')}</Text>
                  </TouchableOpacity>
                  <View style={{ backgroundColor: activeTheme.primary + '15', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
                     <Text style={{ color: activeTheme.primary, fontWeight: '700', fontSize: 14 }}>{selectedProducts.length}/{allProducts.length}</Text>
                  </View>
               </View>
               
               <View style={{ marginTop: 20 }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: isDarkMode ? '#F1F5F9' : '#1F2937' }}>{t('manage_display')}</Text>
                  <Text style={{ fontSize: 13, color: isDarkMode ? '#64748B' : '#9CA3AF', marginTop: 4 }}>{t('filter')}</Text>
               </View>
               
               <TouchableOpacity onPress={toggleAllProducts} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', padding: 14, borderRadius: 12 }}>
                  <Ionicons name={selectedProducts.length === allProducts.length ? "checkbox" : "square-outline"} size={24} color={activeTheme.primary} />
                  <Text style={{ color: activeTheme.primary, fontWeight: '600', fontSize: 15 }}>
                     {selectedProducts.length === allProducts.length ? t('deselect_all') : t('select_all')}
                  </Text>
               </TouchableOpacity>
            </View>

            <FlatList
               data={allProducts}
               keyExtractor={(item, index) => index.toString()}
               contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
               showsVerticalScrollIndicator={false}
               renderItem={({ item }) => {
                  const isSelected = selectedProducts.includes(item.name);
                  const totalAll = allProducts.reduce((s, p) => s + p.montant, 0);
                  const percent = totalAll > 0 ? ((item.montant / totalAll) * 100).toFixed(1) : '0';
                  return (
                     <TouchableOpacity 
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 2, borderColor: isSelected ? activeTheme.primary : 'transparent' }} 
                        onPress={() => toggleProductSelection(item.name)}
                        activeOpacity={0.7}
                     >
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isSelected ? activeTheme.primary : (isDarkMode ? '#334155' : '#E5E7EB'), justifyContent: 'center', alignItems: 'center' }}>
                           {isSelected && <Ionicons name="checkmark" size={20} color="#fff" />}
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                           <Text style={{ fontSize: 15, fontWeight: '600', color: isSelected ? (isDarkMode ? '#F1F5F9' : '#1F2937') : (isDarkMode ? '#64748B' : '#9CA3AF') }} numberOfLines={1}>{item.name}</Text>
                           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                              <Text style={{ fontSize: 13, color: isDarkMode ? '#64748B' : '#9CA3AF' }}>{formatMoney(item.montant)} {currency}</Text>
                              <Text style={{ fontSize: 13, color: activeTheme.primary, fontWeight: '600' }}>• {percent}%</Text>
                           </View>
                        </View>
                     </TouchableOpacity>
                  );
               }}
            />
         </View>
      </Modal>

      {/* MENU HAMBURGER */}
      <Modal visible={showMenu} transparent animationType="fade">
         <TouchableOpacity style={s.menuOverlay} onPress={() => setShowMenu(false)}>
            <View style={s.menuBox}>
               <Text style={[s.menuTitle, { color: activeTheme.primary }]}>{t('navigation')}</Text>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/'); }}>
                  <Ionicons name="home-outline" size={22} color="#555" />
                  <Text style={s.menuText}>{t('home')}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/rapports'); }}>
                  <Ionicons name="pie-chart-outline" size={22} color="#555" />
                  <Text style={s.menuText}>{t('reports')}</Text>
               </TouchableOpacity>
            </View>
         </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (theme: any, dark: boolean) => {
  const c = {
    bg: dark ? '#0F172A' : '#F8FAFC',
    card: dark ? '#1E293B' : '#fff',
    text: dark ? '#F1F5F9' : '#1E293B',
    textSec: dark ? '#94A3B8' : '#64748B',
    border: dark ? '#334155' : '#F1F5F9',
    modal: dark ? '#1E293B' : '#fff',
    input: dark ? '#0F172A' : '#fff',
    shadow: dark ? 0.2 : 0.05,
    primary: theme.primary,
    gradient: theme.gradient
  };

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
    iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },

    summaryRow: {
      position: 'absolute', bottom: -35, left: 20, right: 20,
      flexDirection: 'row', backgroundColor: dark ? '#1E293B' : '#fff',
      borderRadius: 20, padding: 20, justifyContent: 'space-around',
      shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: dark ? 0.3 : 0.1, shadowRadius: 8, elevation: 5
    },
    summaryItem: { alignItems: 'center' },
    summaryLabel: { color: dark ? '#94A3B8' : '#9CA3AF', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
    summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
    verticalDivider: { width: 1, backgroundColor: dark ? '#334155' : '#E2E8F0', height: '80%' },

    content: { flex: 1, marginTop: 55, paddingHorizontal: 20 },

    tabContainer: {
      flexDirection: 'row', backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 16,
      padding: 5, marginBottom: 20, elevation: 2
    },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    tabText: { color: dark ? '#94A3B8' : '#64748B', fontWeight: '600', fontSize: 13 },

    card: {
      backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 24, padding: 20, marginBottom: 20,
      shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 3
    },
    cardTitle: { fontSize: 18, fontWeight: '800', color: dark ? '#F1F5F9' : '#1F2937', marginBottom: 5 },
    cardSub: { fontSize: 12, color: dark ? '#94A3B8' : '#9CA3AF' },

    progressContainer: { marginBottom: 15, backgroundColor: dark ? '#334155' : '#F8FAFC', padding: 12, borderRadius: 14 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 14, fontWeight: '600', color: dark ? '#F1F5F9' : '#333', textTransform: 'capitalize' },
    progressValue: { fontSize: 14, fontWeight: '700', color: dark ? '#94A3B8' : '#64748B' },
    track: { height: 8, backgroundColor: dark ? '#1E293B' : '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
    bar: { height: '100%', borderRadius: 4 },
    progressSub: { fontSize: 11, color: dark ? '#94A3B8' : '#9CA3AF' },

    legendContainerPro: { marginTop: 20, backgroundColor: dark ? '#0F172A' : '#F8FAFC', borderRadius: 16, padding: 5 },
    legendItemPro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, marginVertical: 2, backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 12 },
    colorBar: { width: 5, height: 40, borderRadius: 3 },
    legendNamePro: { fontSize: 14, color: dark ? '#F1F5F9' : '#1F2937', fontWeight: '700' },
    legendAmountPro: { fontSize: 12, color: dark ? '#94A3B8' : '#6B7280', marginTop: 2 },
    percentBadgePro: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 55, alignItems: 'center' },
    percentTextPro: { fontSize: 13, fontWeight: 'bold', color: '#fff' },

    lineChart: {
      borderRadius: 16,
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', padding: 20, paddingTop: 60 },
    menuBox: { backgroundColor: dark ? '#1E293B' : '#fff', padding: 20, borderRadius: 20, width: 200, alignSelf: 'flex-end', elevation: 10 },
    menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#f0f0f0' },
    menuText: { fontSize: 14, fontWeight: '500', color: dark ? '#F1F5F9' : '#333' },

    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', padding: 20, paddingTop: 60 },

    // JournalModal styles déjà utilisés
    modalContainer: { flex: 1, backgroundColor: dark ? '#0F172A' : '#fff', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 20 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: dark ? '#F1F5F9' : '#333', textTransform: 'capitalize' },
    modalCloseBtn: { padding: 5 },
    modalSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#f0f0f0', marginBottom: 10 },
    modalLabel: { fontSize: 12, color: '#999', fontWeight: '600', textTransform: 'uppercase' },
    modalTotal: { fontSize: 24, fontWeight: '800' },
    btnPdf: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1 },
    journalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#f5f5f5' },
    journalLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    dateBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    journalName: { fontSize: 16, fontWeight: '600', color: dark ? '#F1F5F9' : '#333' },
    journalSub: { fontSize: 12, color: '#999' },
    journalPrice: { fontSize: 16, fontWeight: '700', color: dark ? '#F1F5F9' : '#333' },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontStyle: 'italic' },
  });
};