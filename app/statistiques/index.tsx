import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet, 
  Animated, Modal, ActivityIndicator, Alert, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import Svg, { G, Path, Text as SvgText, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  subWeeks, subMonths, startOfYear, endOfYear 
} from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { router, useFocusEffect } from 'expo-router';

import { useTheme } from '../../src/context/ThemeContext';
import { ThemedStatusBar } from '../../src/components/ThemedStatusBar';
import { useSettings } from '../../src/context/SettingsContext';
import { DepenseService } from '../../src/services/depenseService';
import formatMoney from '../../src/utils/formatMoney';
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
  idPeriode: string;
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

interface ProductItem {
  name: string;
  montant: number;
}

type ViewMode = 'repartition' | 'weekly' | 'monthly' | 'monthFull' | 'yearly';

const COLOR_PALETTE = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#06B6D4', '#A855F7', '#22C55E', '#0EA5E9', '#E11D48',
  '#64748B', '#8B5CF6', '#10B981', '#F43F5E', '#8B5CF6' // Plus de couleurs pour "Tous les produits"
];

// --- COMPOSANT CAMEMBERT PERSONNALISÉ (MODIFIÉ POUR AFFICHER LE PRIX) ---
interface CustomPieChartProps {
  data: ChartData[];
  size: number;
  innerRadius?: number;
  total: number;
  isDarkMode: boolean;
  currency: string;
}

const CustomPieChart: React.FC<CustomPieChartProps> = ({ 
  data, size, innerRadius = 0, total, isDarkMode, currency
}: CustomPieChartProps) => {
  const radius = size / 2 - 10;
  const center = size / 2;
  
  const slices = useMemo(() => {
    if (total <= 0 || data.length === 0) return [];
    
    let currentAngle = -90;
    const result: Array<{path: string; color: string; name: string; value: number; percent: number; labelX: number; labelY: number;}> = [];

    data.forEach((item: ChartData) => {
      if (item.population <= 0) return;
      const percent = (item.population / total) * 100;
      const angle = (item.population / total) * 360;
      
      
      const midAngle = currentAngle + angle / 2;
      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = ((currentAngle + angle) * Math.PI) / 180;
      const midRad = (midAngle * Math.PI) / 180;
      
      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);
      const ix1 = center + innerRadius * Math.cos(startRad);
      const iy1 = center + innerRadius * Math.sin(startRad);
      const ix2 = center + innerRadius * Math.cos(endRad);
      const iy2 = center + innerRadius * Math.sin(endRad);
      
      const labelRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.7;
      const labelX = center + labelRadius * Math.cos(midRad);
      const labelY = center + labelRadius * Math.sin(midRad);
      
      const largeArc = angle > 180 ? 1 : 0;
      
      let path: string;
      if (innerRadius > 0) {
        path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
      } else {
        path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      }
      
      result.push({ path, color: item.color, name: item.name, value: item.population, percent, labelX, labelY });
      currentAngle += angle;
    });
    return result;
  }, [data, total, center, radius, innerRadius]);

  const truncateName = (name: string, maxLength: number) => name.length <= maxLength ? name : name.substring(0, maxLength - 1) + '.';
  
  
  const getTextColor = (bgColor: string) => { 
    try { 
      const hex = bgColor.replace('#', ''); 
      const r = Number.parseInt(hex.substring(0, 2), 16); 
      const g = Number.parseInt(hex.substring(2, 4), 16); 
      const b = Number.parseInt(hex.substring(4, 6), 16); 
      return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.6 ? '#1F2937' : '#FFFFFF'; 
    } catch { return '#FFFFFF'; } 
  };

  if (slices.length === 0) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', height: size }}>
        <Ionicons name="pie-chart-outline" size={60} color={isDarkMode ? '#334155' : '#E5E7EB'} />
        <Text style={{ color: isDarkMode ? '#64748B' : '#9CA3AF', marginTop: 10 }}>Aucune donnée</Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((slice: any, index: number) => {
            // 🎯 SOLUTION 3 : Seuils optimisés
            const isBigSlice = slice.percent >= 8;    // Portions >= 8% = texte normal
            const isMediumSlice = slice.percent >= 3; // Portions 3-8% = texte réduit
            const isSmallSlice = slice.percent < 3;   // Portions < 3% = pas de texte
            
            const showText = !isSmallSlice; // Afficher texte si >= 3%
            const textColor = getTextColor(slice.color);

            return (
              <React.Fragment key={`slice-${index}-${slice.name}`}>
                <Path d={slice.path} fill={slice.color} stroke={isDarkMode ? '#0F172A' : '#FFFFFF'} strokeWidth={1.5} />
                
                {showText && (
                  <>
                    {/* LIGNE 1 : NOM DU PRODUIT */}
                    <SvgText 
                      x={slice.labelX} 
                      y={slice.labelY - (isBigSlice ? 14 : isMediumSlice ? 11 : 8)} 
                      fontSize={isBigSlice ? 11 : isMediumSlice ? 9 : 7} 
                      fontWeight="bold" 
                      fill={textColor} 
                      textAnchor="middle" 
                      alignmentBaseline="middle"
                    >
                      {truncateName(slice.name, isBigSlice ? 12 : isMediumSlice ? 8 : 5)}
                    </SvgText>

                    {/* LIGNE 2 : PRIX */}
                    <SvgText 
                      x={slice.labelX} 
                      y={slice.labelY} 
                      fontSize={isBigSlice ? 12 : isMediumSlice ? 10 : 7} 
                      fontWeight="800" 
                      fill={textColor} 
                      textAnchor="middle" 
                      alignmentBaseline="middle"
                    >
                      {Math.round(slice.value).toLocaleString()} {currency}
                    </SvgText>

                    {/* LIGNE 3 : POURCENTAGE */}
                    <SvgText 
                      x={slice.labelX} 
                      y={slice.labelY + (isBigSlice ? 14 : isMediumSlice ? 11 : 8)} 
                      fontSize={isBigSlice ? 10 : isMediumSlice ? 8 : 6} 
                      fontWeight="600" 
                      fill={textColor} 
                      textAnchor="middle" 
                      alignmentBaseline="middle" 
                      opacity={0.85}
                    >
                      {Math.round(slice.percent)}%
                    </SvgText>
                  </>
                )}
              </React.Fragment>
            );
          })}
          {innerRadius > 0 && <Circle cx={center} cy={center} r={innerRadius - 5} fill={isDarkMode ? '#1E293B' : '#FFFFFF'} />}
        </G>
      </Svg>

      {/* Légende détaillée (toujours utile pour les très petites parts) */}
      <View style={{ marginTop: 15, width: '100%' }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: isDarkMode ? '#64748B' : '#9CA3AF', marginBottom: 10, textAlign: 'center' }}>
          Légende détaillée
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {slices.map((slice: any, index: number) => (
            <View key={`legend-${slice.name}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: slice.color + '40' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: slice.color, marginRight: 6 }} />
              <Text style={{ fontSize: 11, color: isDarkMode ? '#E5E7EB' : '#374151', fontWeight: '500' }}>{slice.name}</Text>
              <Text style={{ fontSize: 11, color: slice.color, fontWeight: 'bold', marginLeft: 4 }}>{Math.round(slice.percent)}%</Text>
              {/* Le prix est aussi dans la légende pour confirmer */}
              <Text style={{ fontSize: 11, color: isDarkMode ? '#94A3B8' : '#64748B', marginLeft: 4 }}>
                ({formatMoney(slice.value)} {currency})
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};


export default function StatsScreen() {
  const { activeTheme, isDarkMode } = useTheme();
  const { currency, language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => getStyles(activeTheme, isDarkMode), [activeTheme, isDarkMode]);
  const locale = useMemo(() => language === 'en' ? enUS : fr, [language]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartData[]>([]);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showAllProductsModal, setShowAllProductsModal] = useState(false);
  const [totalYear, setTotalYear] = useState(0);
  const [totalMonth, setTotalMonth] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('repartition'); 
  const [weeklyData, setWeeklyData] = useState<ComparativeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ComparativeData[]>([]);
  const [yearlyData, setYearlyData] = useState<ComparativeData[]>([]);
  const [monthFullData, setMonthFullData] = useState<ComparativeData[]>([]);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<ComparativeData | null>(null);
  const [journalData, setJournalData] = useState<ProductEntry[]>([]);
  
  const [showMenu, setShowMenu] = useState(false);

  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleChart = useRef(new Animated.Value(0)).current;
  const rotateChart = useRef(new Animated.Value(0)).current;

  const weeklyLineData = useMemo(() => {
    if (!weeklyData.length) return null;
    const sorted = [...weeklyData].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    let values: number[] = sorted.map((w: ComparativeData) => w.montant || 0);
    if (values.every(v => v === 0)) {
      values = [0.01, ...values.slice(1)];
    }
    return { labels: sorted.map((w: ComparativeData) => format(new Date(w.startDate), 'dd/MM')), values };
  }, [weeklyData]);

  const monthlyLineData = useMemo(() => {
    if (!monthlyData.length) return null;
    const sorted = [...monthlyData].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    let values: number[] = sorted.map((m: ComparativeData) => m.montant || 0);
    if (values.every(v => v === 0)) {
      values = [0.01, ...values.slice(1)];
    }
    return { labels: sorted.map((m: ComparativeData) => format(new Date(m.startDate), 'MMM', { locale })), values };
  }, [monthlyData, locale]);

  const yearlyLineData = useMemo(() => {
    if (!yearlyData.length) return null;
    const sorted = [...yearlyData].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    let values: number[] = sorted.map((y: ComparativeData) => y.montant || 0);
    if (values.every(v => v === 0)) {
      values = [0.01, ...values.slice(1)];
    }
    return { labels: sorted.map((y: ComparativeData) => format(new Date(y.startDate), 'yyyy')), values };
  }, [yearlyData, locale]);

  const maxWeeklyAmount = useMemo(() => Math.max(...weeklyData.map((i: ComparativeData) => i.montant), 1), [weeklyData]);
  const maxMonthlyAmount = useMemo(() => Math.max(...monthlyData.map((i: ComparativeData) => i.montant), 1), [monthlyData]);
  const maxYearlyAmount = useMemo(() => Math.max(...yearlyData.map((i: ComparativeData) => i.montant), 1), [yearlyData]);
  const maxMonthFullAmount = useMemo(() => Math.max(...monthFullData.map((i: ComparativeData) => i.montant), 1), [monthFullData]);

  useFocusEffect(useCallback(() => { loadAllData(); }, [language]));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 6, tension: 40, useNativeDriver: true })
    ]).start();
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      scaleChart.setValue(0); rotateChart.setValue(0);
      Animated.parallel([
        Animated.spring(scaleChart, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
        Animated.timing(rotateChart, { toValue: 1, duration: 1000, useNativeDriver: true })
      ]).start();
    }
  }, [data]);

  const spin = rotateChart.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] });

  // --- LOGIQUE MÉTIER ---
  const loadAllData = async () => {
    setLoading(true);
    try {
      await DepenseService.calculerTotalGlobal();
      const now = new Date();
      const tYear = await DepenseService.getTotalSurPeriode(format(startOfYear(now), 'yyyy-MM-dd'), format(endOfYear(now), 'yyyy-MM-dd')); setTotalYear(tYear || 0);
      const tMonth = await DepenseService.getTotalSurPeriode(format(startOfMonth(now), 'yyyy-MM-dd'), format(endOfMonth(now), 'yyyy-MM-dd')); setTotalMonth(tMonth || 0);

      const products = await DepenseService.getRepartitionParProduit() || [];
      console.log('[STATS] Produits récupérés:', products.length, products);
      setAllProducts(products);
      if (selectedProducts.length === 0 && products.length > 0) {
        // Par défaut, top 5 pour que ce soit joli
        const topNames = products.slice(0, 5).map(r => r.name);
        console.log('[STATS] Sélection par défaut (top 5):', topNames);
        setSelectedProducts(topNames); updateChartData(products, topNames);
      } else {
        console.log('[STATS] Utilisation de la sélection existante:', selectedProducts);
        updateChartData(products, selectedProducts);
      }

      await loadComparative();
      await loadYearlyComparative();
      await loadMonthFullData();
    } catch (e) { 
      console.error('[STATS] Erreur lors du chargement:', e); 
      Alert.alert(t('error') || 'Erreur', t('error_loading_stats') || 'Erreur de chargement');
    } finally { setLoading(false); }
  };

  const updateChartData = (products: ProductItem[], selection: string[]) => {
    console.log('[STATS] updateChartData - products:', products.length, 'selection:', selection.length);
    let filteredRows = products.filter(p => selection.includes(p.name));
    console.log('[STATS] Lignes filtrées:', filteredRows.length, filteredRows);
    
    // 🎯 SOLUTION 1 & 2 : Tri par montant décroissant
    filteredRows.sort((a, b) => (b.montant || 0) - (a.montant || 0));
    
    const total = filteredRows.reduce((sum: number, p: ProductItem) => sum + (p.montant || 0), 0);
    console.log('[STATS] Total calculé:', total);
    setFilteredTotal(total);
    
    if (filteredRows.length === 0 || total === 0) { 
      console.log('[STATS] Aucune donnée à afficher');
      setData([]); 
      return; 
    }
    
    // 🎯 SOLUTION 1 : Limitation intelligente - Top 7 + Autres
    const MAX_DISPLAY = 7;
    let finalData: ProductItem[] = [];
    
    if (filteredRows.length > MAX_DISPLAY) {
      // Prendre les 7 premiers (déjà triés)
      const topProducts = filteredRows.slice(0, MAX_DISPLAY);
      const otherProducts = filteredRows.slice(MAX_DISPLAY);
      
      // Calculer le total des "Autres"
      const otherTotal = otherProducts.reduce((sum: number, p: ProductItem) => sum + (p.montant || 0), 0);
      
      finalData = [
        ...topProducts,
        { name: `Autres (${otherProducts.length})`, montant: otherTotal }
      ];
    } else {
      finalData = filteredRows;
    }
    
    setData(finalData.map((r: ProductItem, i: number) => ({
      name: r.name, 
      population: r.montant || 0, 
      color: COLOR_PALETTE[i % COLOR_PALETTE.length], 
      legendFontColor: isDarkMode ? '#ccc' : '#666', 
      legendFontSize: 12
    })));
  };

  const toggleProductSelection = (name: string) => {
    const newSelection = selectedProducts.includes(name) ? selectedProducts.filter((n: string) => n !== name) : [...selectedProducts, name];
    setSelectedProducts(newSelection); updateChartData(allProducts, newSelection);
  };

  const toggleAllProducts = () => {
    if (selectedProducts.length === allProducts.length) { setSelectedProducts([]); updateChartData(allProducts, []); } 
    else { const allNames = allProducts.map((p: ProductItem) => p.name); setSelectedProducts(allNames); updateChartData(allProducts, allNames); }
  };

  const loadComparative = async () => {
    try {
      const weeks: ComparativeData[] = [];
      for (let i = 0; i < 4; i++) {
        const d = subWeeks(new Date(), i);
        const sStr = format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const eStr = format(endOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const stats = await DepenseService.getStatsComparatives(sStr, eStr);
        weeks.push({ idPeriode: `w-${i}`, period: `Sem. ${format(startOfWeek(d), 'dd/MM')}`, fullLabel: `Semaine du ${format(startOfWeek(d), 'dd MMM', { locale })}`, montant: stats?.montant || 0, nbAchats: stats?.nbAchats || 0, startDate: sStr, endDate: eStr });
      }
      setWeeklyData(weeks);

      const months: ComparativeData[] = [];
      for (let i = 0; i < 3; i++) {
        const d = subMonths(new Date(), i);
        const sStr = format(startOfMonth(d), 'yyyy-MM-dd');
        const eStr = format(endOfMonth(d), 'yyyy-MM-dd');
        const stats = await DepenseService.getStatsComparatives(sStr, eStr);
        months.push({ idPeriode: `m-${i}`, period: format(startOfMonth(d), 'MMM', { locale }), fullLabel: format(startOfMonth(d), 'MMMM yyyy', { locale }), montant: stats?.montant || 0, nbAchats: stats?.nbAchats || 0, startDate: sStr, endDate: eStr });
      }
      setMonthlyData(months);
    } catch (e) { console.error(e); }
  };

  const loadYearlyComparative = async () => {
    try {
      const years: ComparativeData[] = [];
      for (let i = 0; i < 3; i++) {
        const year = new Date().getFullYear() - i;
        const sStr = `${year}-01-01`;
        const eStr = `${year}-12-31`;
        const stats = await DepenseService.getStatsComparatives(sStr, eStr);
        years.push({ 
          idPeriode: `y-${i}`, 
          period: `${year}`, 
          fullLabel: `Année ${year}`, 
          montant: stats?.montant || 0, 
          nbAchats: stats?.nbAchats || 0, 
          startDate: sStr, 
          endDate: eStr 
        });
      }
      setYearlyData(years);
    } catch (e) { console.error(e); }
  };

  const loadMonthFullData = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const days: ComparativeData[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const sStr = format(date, 'yyyy-MM-dd 00:00:00');
        const eStr = format(date, 'yyyy-MM-dd 23:59:59');
        const stats = await DepenseService.getStatsComparatives(sStr, eStr);
        days.push({
          idPeriode: `d-${day}`,
          period: `${day}`,
          fullLabel: format(date, 'd MMM', { locale }),
          montant: stats?.montant || 0,
          nbAchats: stats?.nbAchats || 0,
          startDate: sStr,
          endDate: eStr,
        });
      }
      setMonthFullData(days);
    } catch (e) { console.error(e); }
  };

  const openDetailModal = async (item: ComparativeData) => {
    setSelectedPeriod(item);
    try {
      const res = await DepenseService.getDetailsProduitsSurPeriode(item.startDate, item.endDate);
      setJournalData((res as ProductEntry[]) || []); setShowDetailModal(true);
    } catch (e) { console.error(e); }
  };

  const lineChartConfig = useMemo(() => ({
    backgroundColor: 'transparent', backgroundGradientFrom: isDarkMode ? '#0F172A' : '#F8FAFC', backgroundGradientTo: isDarkMode ? '#0F172A' : '#F8FAFC',
    decimalPlaces: 0, color: (opacity = 1) => {
      const hex = Math.round(opacity * 255).toString(16);
      return `${activeTheme.primary}${hex.length === 1 ? '0' + hex : hex}`;
    },
    labelColor: () => isDarkMode ? '#E5E7EB' : '#6B7280', propsForDots: { r: '4', strokeWidth: '2', stroke: activeTheme.secondary },
    propsForBackgroundLines: { strokeDasharray: '', stroke: isDarkMode ? '#1F2937' : '#E5E7EB' }
  }), [isDarkMode, activeTheme]);

  const getActiveTabColor = () => '#fff';
  const getInactiveTabColor = () => isDarkMode ? '#94A3B8' : '#64748B';
  
  const getTabIconColor = (isActive: boolean) => {
    return isActive ? getActiveTabColor() : getInactiveTabColor();
  };

  const getSelectAllText = () => {
    const isAllSelected = selectedProducts.length === allProducts.length;
    return isAllSelected ? 
      (t('deselect_all') || 'Tout désélectionner') : 
      (t('select_all') || 'Tout sélectionner');
  };

  const renderProgressBar = useCallback((item: ComparativeData, max: number) => {
    const percent = max > 0 ? (item.montant / max) * 100 : 0;
    return (
      <TouchableOpacity key={item.idPeriode} onPress={() => openDetailModal(item)} style={s.progressContainer}>
        <View style={s.progressHeader}>
          <Text style={s.progressLabel}>{item.period}</Text>
          <Text style={s.progressValue}>{formatMoney(item.montant)} {currency}</Text>
        </View>
        <View style={s.track}><LinearGradient colors={[activeTheme.primary, activeTheme.secondary] as readonly [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.bar, { width: `${Math.min(percent, 100)}%` }]} /></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={s.progressSub}>{item.nbAchats} {t('purchase_s') || 'achats'}</Text>
          <Text style={[s.progressSub, { color: activeTheme.primary, fontWeight: 'bold' }]}>{t('see_details') || 'Voir détails'} →</Text>
        </View>
      </TouchableOpacity>
    );
  }, [s, currency, activeTheme, t]);

  const renderProductItem = useCallback(({ item }: { item: ProductItem }) => {
    const isSelected = selectedProducts.includes(item.name);
    const totalAll = allProducts.reduce((sum: number, p: ProductItem) => sum + (p.montant || 0), 0);
      const percent = totalAll > 0 ? ((item.montant / totalAll) * 100).toFixed(1) : '0';
    const badgeColor = COLOR_PALETTE[0]; // Utilisé statiquement au lieu d'index
    
    // Séparer la ternaire imbriquée
    const checkboxBg = isSelected ? activeTheme.primary : (isDarkMode ? '#334155' : '#E5E7EB');
    
    return (
      <TouchableOpacity style={[s.productItem, isSelected && { borderColor: activeTheme.primary, borderWidth: 2 }]} onPress={() => toggleProductSelection(item.name)} activeOpacity={0.7}>
        <View style={[s.productCheckbox, { backgroundColor: checkboxBg }]}>{isSelected && <Ionicons name="checkmark" size={20} color="#fff" />}</View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={[s.colorDot, { backgroundColor: badgeColor }]} /><Text style={[s.productName, !isSelected && { opacity: 0.5 }]} numberOfLines={1}>{item.name}</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}><Text style={s.productAmount}>{formatMoney(item.montant)} {currency}</Text><View style={[s.percentBadge, { backgroundColor: badgeColor + '20' }]}><Text style={[s.percentText, { color: badgeColor }]}>{`${percent}%`}</Text></View></View>
        </View>
      </TouchableOpacity>
    );
  }, [selectedProducts, allProducts, currency, isDarkMode, activeTheme, s]);

  if (loading) return (<View style={s.center}><ActivityIndicator size="large" color={activeTheme.primary} /><Text style={{ color: isDarkMode ? '#94A3B8' : '#64748B', marginTop: 10 }}>Chargement...</Text></View>);

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      {/* HEADER */}
      <LinearGradient colors={activeTheme.gradient as [string, string, ...string[]]} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.push('/')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, opacity: 0.9 }}>
          <Ionicons name="home-outline" size={16} color="rgba(255,255,255,0.8)" /><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginLeft: 5 }}>{t('home') || 'Accueil'}</Text><Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" style={{ marginHorizontal: 4 }} /><Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{t('statistics') || 'Graphiques'}</Text>
        </TouchableOpacity>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
          <Text style={s.headerTitle}>{t('statistics') || 'Graphiques'}</Text>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={s.iconBtn}><Ionicons name="menu" size={24} color="white" /></TouchableOpacity>
        </View>
        <View style={s.summaryRow}>
          <View style={s.summaryItem}><Text style={s.summaryLabel}>{t('total_spent_month') || 'Ce mois'}</Text><Text style={[s.summaryValue, { color: activeTheme.primary }]}>{formatMoney(totalMonth)} {currency}</Text></View>
          <View style={s.verticalDivider} />
          <View style={s.summaryItem}><Text style={s.summaryLabel}>{t('total_year') || 'Année'} {new Date().getFullYear()}</Text><Text style={[s.summaryValue, { color: activeTheme.primary }]}>{formatMoney(totalYear)} {currency}</Text></View>
        </View>
      </LinearGradient>

      {/* CONTENT */}
      <Animated.ScrollView style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        <View style={s.tabContainer}>
          {[
            { k: 'repartition', l: t('distribution') || 'Répartition', icon: 'pie-chart' },
            { k: 'weekly', l: t('week') || 'Semaine', icon: 'calendar' },
            { k: 'monthly', l: t('month') || 'Mois', icon: 'calendar-outline' },
            { k: 'monthFull', l: t('month_full') || 'Mois complet', icon: 'grid-outline' }
          ].map(tab => (
            <TouchableOpacity key={tab.k} style={[s.tab, viewMode === tab.k && { backgroundColor: activeTheme.primary }]} onPress={() => setViewMode(tab.k as ViewMode)}>
              <Ionicons name={tab.icon as any} size={16} color={getTabIconColor(viewMode === tab.k)} />
              <Text style={[s.tabText, viewMode === tab.k && { color: '#fff', fontWeight: 'bold' }]}>{tab.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* VUE 1 : RÉPARTITION */}
        {viewMode === 'repartition' && (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <View>
                <Text style={s.cardTitle}>📊 {t('distribution') || 'Répartition'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: isDarkMode ? '#94A3B8' : '#9CA3AF' }}>
                    {selectedProducts.length} {t('products') || 'produits'} sélectionnés
                  </Text>
                  {/* 🎯 SOLUTION 4 : Badge d'information si limitation active */}
                  {selectedProducts.length > 7 && (
                    <View style={{ backgroundColor: activeTheme.primary + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                      <Text style={{ fontSize: 10, color: activeTheme.primary, fontWeight: '700' }}>
                        Top 7 + Autres
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowAllProductsModal(true)} style={s.filterBtn}><Ionicons name="options-outline" size={16} color={activeTheme.primary} /><Text style={{ color: activeTheme.primary, fontWeight: '600', fontSize: 13 }}>{t('filter') || 'Filtrer'}</Text></TouchableOpacity>
            </View>
            <Animated.View style={{ transform: [{ scale: scaleChart }, { rotate: spin }] }}>
              <CustomPieChart data={data} size={SCREEN_WIDTH - 60} innerRadius={0} total={filteredTotal} isDarkMode={isDarkMode} currency={currency} />
            </Animated.View>
            {filteredTotal > 0 && (
              <View style={s.totalBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.totalIcon, { backgroundColor: activeTheme.primary + '20' }]}><Ionicons name="wallet" size={20} color={activeTheme.primary} /></View>
                  <View><Text style={{ fontSize: 12, color: isDarkMode ? '#94A3B8' : '#6B7280', fontWeight: '600' }}>{t('total') || 'Total'}</Text><Text style={{ fontSize: 24, fontWeight: 'bold', color: activeTheme.primary }}>{formatMoney(filteredTotal)} {currency}</Text></View>
                </View>
              </View>
            )}
            <TouchableOpacity style={[s.manageBtn, { backgroundColor: activeTheme.primary }]} onPress={() => setShowAllProductsModal(true)}><Ionicons name="pie-chart-outline" size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{t('manage_display') || 'Gérer l\'affichage'}</Text></TouchableOpacity>
          </View>
        )}

        {/* VUE 2 : SEMAINE */}
        {viewMode === 'weekly' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('last_4_weeks') || 'Les 4 dernières semaines'}</Text>
            <View style={{ marginTop: 15, alignItems: 'center' }}>
              {weeklyLineData?.values.some((v: number) => v > 0.01) ? (
                <LineChart data={{ labels: weeklyLineData.labels, datasets: [{ data: weeklyLineData.values }] }} width={SCREEN_WIDTH - 60} height={220} yAxisLabel="" yAxisSuffix="" chartConfig={lineChartConfig} bezier style={s.lineChart} />
              ) : (
                <View style={s.emptyChart}><Ionicons name="analytics-outline" size={50} color={isDarkMode ? '#334155' : '#E5E7EB'} /><Text style={{ color: isDarkMode ? '#64748B' : '#9CA3AF', marginTop: 10 }}>{t('no_data') || 'Pas de données'}</Text></View>
              )}
            </View>
            <View style={{ marginTop: 15 }}>{weeklyData.map(item => renderProgressBar(item, maxWeeklyAmount))}</View>
          </View>
        )}

        {/* VUE 3 : MOIS */}
        {viewMode === 'monthly' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('last_3_months') || 'Les 3 derniers mois'}</Text>
            <View style={{ marginTop: 15, alignItems: 'center' }}>
              {monthlyLineData?.values.some((v: number) => v > 0.01) ? (
                <LineChart data={{ labels: monthlyLineData.labels, datasets: [{ data: monthlyLineData.values }] }} width={SCREEN_WIDTH - 60} height={220} yAxisLabel="" yAxisSuffix="" chartConfig={lineChartConfig} bezier style={s.lineChart} />
              ) : (
                <View style={s.emptyChart}><Ionicons name="analytics-outline" size={50} color={isDarkMode ? '#334155' : '#E5E7EB'} /><Text style={{ color: isDarkMode ? '#64748B' : '#9CA3AF', marginTop: 10 }}>{t('no_data') || 'Pas de données'}</Text></View>
              )}
            </View>
            <View style={{ marginTop: 15 }}>{monthlyData.map(item => renderProgressBar(item, maxMonthlyAmount))}</View>
          </View>
        )}

        {/* VUE 4 : MOIS COMPLET (1-31) */}
        {viewMode === 'monthFull' && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📅 {format(new Date(), 'MMMM yyyy', { locale })}</Text>
            
            {/* Stats du mois */}
            <View style={{ marginTop: 15, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#94A3B8' : '#64748B', fontWeight: '600', marginBottom: 4 }}>MAX</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: activeTheme.primary }}>{formatMoney(maxMonthFullAmount)}</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#94A3B8' : '#64748B', fontWeight: '600', marginBottom: 4 }}>MIN</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#10B981' }}>
                    {formatMoney(Math.min(...monthFullData.filter(d => d.montant > 0).map(d => d.montant), maxMonthFullAmount))}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#94A3B8' : '#64748B', fontWeight: '600', marginBottom: 4 }}>MOY</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: isDarkMode ? '#F1F5F9' : '#1E293B' }}>
                    {formatMoney(monthFullData.reduce((sum, d) => sum + d.montant, 0) / monthFullData.length)}
                  </Text>
                </View>
              </View>

              {/* Graphique à barres pour tout le mois */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 200, paddingHorizontal: 10 }}>
                  {monthFullData.map((day, index) => {
                    const barHeight = maxMonthFullAmount > 0 ? (day.montant / maxMonthFullAmount) * 160 : 0;
                    const isToday = format(new Date(), 'd') === day.period;
                    return (
                      <TouchableOpacity
                        key={day.idPeriode}
                        onPress={() => openDetailModal(day)}
                        style={{ alignItems: 'center', marginHorizontal: 4 }}
                      >
                        <Text style={{ fontSize: 10, color: isToday ? activeTheme.secondary : (isDarkMode ? '#94A3B8' : '#64748B'), fontWeight: isToday ? 'bold' : '500', marginBottom: 4 }}>
                          {formatMoney(day.montant)}
                        </Text>
                        <LinearGradient
                          colors={isToday ? [activeTheme.secondary, activeTheme.secondary + '80'] : [activeTheme.primary, activeTheme.primary + '80']}
                          style={{ width: 20, height: Math.max(barHeight, 5), borderRadius: 4 }}
                        />
                        <Text style={{ fontSize: 11, marginTop: 6, color: isToday ? activeTheme.secondary : (isDarkMode ? '#64748B' : '#9CA3AF'), fontWeight: isToday ? 'bold' : '500' }}>
                          {day.period}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Bouton Analyse générale */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                  padding: 14,
                  borderRadius: 12,
                  marginTop: 20,
                  gap: 8,
                }}
                onPress={() => router.push('/rapports')}
              >
                <Ionicons name="trending-up" size={18} color={activeTheme.primary} />
                <Text style={{ color: activeTheme.primary, fontWeight: '700', fontSize: 14 }}>
                  {t('general_analysis') || 'Analyse générale'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* BOUTON VERS RAPPORTS PDF (visible pour tous les modes) */}
        {viewMode !== 'monthFull' && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDarkMode ? '#1E293B' : '#fff',
              padding: 18,
              borderRadius: 20,
              marginBottom: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDarkMode ? 0.2 : 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={() => router.push('/rapports')}
            activeOpacity={0.7}
          >
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              backgroundColor: activeTheme.primary + '20',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 14,
            }}>
              <Ionicons name="document-text" size={24} color={activeTheme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: isDarkMode ? '#F1F5F9' : '#1E293B', marginBottom: 4 }}>
                {t('export_detailed_report') || 'Exporter un rapport détaillé'}
              </Text>
              <Text style={{ fontSize: 13, color: isDarkMode ? '#94A3B8' : '#64748B' }}>
                {t('generate_pdf') || 'Générer un PDF complet'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={activeTheme.primary} />
          </TouchableOpacity>
        )}
      </Animated.ScrollView>

      {/* MODAL JOURNAL */}
      <JournalModal visible={showDetailModal} onClose={() => setShowDetailModal(false)} selectedPeriod={selectedPeriod} journalData={journalData} activeTheme={activeTheme} isDarkMode={isDarkMode} currency={currency} t={t} />

      {/* MODAL PRODUITS */}
      <Modal visible={showAllProductsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAllProductsModal(false)}>
        <View style={{ flex: 1, backgroundColor: isDarkMode ? '#0F172A' : '#fff' }}>
          <View style={s.productModalHeader}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowAllProductsModal(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name="arrow-back" size={24} color={activeTheme.primary} /><Text style={{ fontSize: 16, fontWeight: '600', color: activeTheme.primary }}>{t('back') || 'Retour'}</Text></TouchableOpacity>
              <View style={s.selectedBadge}><Text style={{ color: activeTheme.primary, fontWeight: '700', fontSize: 14 }}>{selectedProducts.length}/{allProducts.length}</Text></View>
            </View>
            <View style={{ marginTop: 20 }}><Text style={{ fontSize: 20, fontWeight: '800', color: isDarkMode ? '#F1F5F9' : '#1F2937' }}>🎯 {t('manage_display') || 'Gérer l\'affichage'}</Text><Text style={{ fontSize: 13, color: isDarkMode ? '#64748B' : '#9CA3AF', marginTop: 4 }}>Sélectionnez les produits à afficher</Text></View>
            <TouchableOpacity onPress={toggleAllProducts} style={s.toggleAllBtn}><Ionicons name={selectedProducts.length === allProducts.length ? "checkbox" : "square-outline"} size={24} color={activeTheme.primary} /><Text style={{ color: activeTheme.primary, fontWeight: '600', fontSize: 15 }}>{getSelectAllText()}</Text></TouchableOpacity>
          </View>
          <FlatList data={allProducts} keyExtractor={(_: any, index: number) => index.toString()} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} renderItem={renderProductItem} ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 50 }}><Ionicons name="cube-outline" size={60} color={isDarkMode ? '#334155' : '#E5E7EB'} /><Text style={{ color: isDarkMode ? '#64748B' : '#9CA3AF', marginTop: 10 }}>Aucun produit</Text></View>} />
        </View>
      </Modal>

      {/* MENU */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={s.menuBox}>
            <Text style={[s.menuTitle, { color: activeTheme.primary }]}>🧭 {t('navigation') || 'Navigation'}</Text>
            <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/'); }}><Ionicons name="home-outline" size={22} color={activeTheme.primary} /><Text style={s.menuText}>{t('home') || 'Accueil'}</Text></TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/journal'); }}><Ionicons name="book-outline" size={22} color={activeTheme.primary} /><Text style={s.menuText}>{t('journal') || 'Journal'}</Text></TouchableOpacity>
            <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); router.push('/rapports'); }}><Ionicons name="document-text-outline" size={22} color={activeTheme.primary} /><Text style={s.menuText}>{t('reports') || 'Rapports'}</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// --- STYLES ---
const getStyles = (theme: any, dark: boolean) => {
  const c = { bg: dark ? '#0F172A' : '#F8FAFC', card: dark ? '#1E293B' : '#fff', text: dark ? '#F1F5F9' : '#1E293B', textSec: dark ? '#94A3B8' : '#64748B', border: dark ? '#334155' : '#F1F5F9' };
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
    header: { paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }, headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' }, iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
    summaryRow: { position: 'absolute', bottom: -35, left: 20, right: 20, flexDirection: 'row', backgroundColor: c.card, borderRadius: 20, padding: 20, justifyContent: 'space-around', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: dark ? 0.3 : 0.1, shadowRadius: 8, elevation: 5 }, summaryItem: { alignItems: 'center' }, summaryLabel: { color: c.textSec, fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }, summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 4 }, verticalDivider: { width: 1, backgroundColor: c.border, height: '80%' },
    content: { flex: 1, marginTop: 55, paddingHorizontal: 20 },
    tabContainer: { flexDirection: 'row', backgroundColor: c.card, borderRadius: 16, padding: 5, marginBottom: 20, elevation: 2, flexWrap: 'wrap', gap: 5 }, tab: { flexBasis: '48%', flexDirection: 'row', paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 4 }, tabText: { color: c.textSec, fontWeight: '600', fontSize: 11 },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 3 }, cardTitle: { fontSize: 18, fontWeight: '800', color: c.text, marginBottom: 5 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    totalBox: { marginTop: 20, padding: 16, backgroundColor: dark ? '#0F172A' : '#F0F9FF', borderRadius: 16, borderWidth: 1, borderColor: theme.primary + '30' }, totalIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    manageBtn: { marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14, gap: 8 },
    emptyChart: { height: 200, justifyContent: 'center', alignItems: 'center' },
    progressContainer: { marginBottom: 15, backgroundColor: dark ? '#334155' : '#F8FAFC', padding: 12, borderRadius: 14 }, progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, progressLabel: { fontSize: 14, fontWeight: '600', color: c.text, textTransform: 'capitalize' }, progressValue: { fontSize: 14, fontWeight: '700', color: c.textSec }, track: { height: 8, backgroundColor: dark ? '#1E293B' : '#E2E8F0', borderRadius: 4, overflow: 'hidden' }, bar: { height: '100%', borderRadius: 4 }, progressSub: { fontSize: 11, color: c.textSec },
    lineChart: { borderRadius: 16 },
    productModalHeader: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border }, selectedBadge: { backgroundColor: theme.primary + '15', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }, toggleAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, backgroundColor: dark ? '#0F172A' : '#F8FAFC', padding: 14, borderRadius: 12 },
    productItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: dark ? '#1E293B' : '#F8FAFC', padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 2, borderColor: 'transparent' }, productCheckbox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, colorDot: { width: 8, height: 8, borderRadius: 4 }, productName: { fontSize: 15, fontWeight: '600', color: c.text }, productAmount: { fontSize: 13, color: c.textSec }, percentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }, percentText: { fontSize: 12, fontWeight: '700' },
    menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', padding: 20, paddingTop: 60 }, menuBox: { backgroundColor: c.card, padding: 20, borderRadius: 20, width: 220, alignSelf: 'flex-end', elevation: 10 }, menuTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 }, menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border }, menuText: { fontSize: 14, fontWeight: '500', color: c.text },
  });
};