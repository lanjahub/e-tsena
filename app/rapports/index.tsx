import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, 
  Animated, Dimensions, Modal, ActivityIndicator, Vibration, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  format, addMonths, subMonths, 
  startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, 
  isSameDay, getDaysInMonth
} from 'date-fns';
import formatMoney from '../../src/utils/formatMoney';
import { fr, enUS } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop, Rect, G } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getDb } from '../../src/db/init';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemedStatusBar } from '../../src/components/ThemedStatusBar';
import { useSettings } from '../../src/context/SettingsContext';
import { TrendCard, ProductRanking } from '../../src/components/ReportComponents';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChartData {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

const COLOR_PALETTE = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#06B6D4', '#A855F7', '#22C55E', '#0EA5E9', '#E11D48',
  '#64748B', '#8B5CF6', '#10B981', '#F43F5E', '#8B5CF6'
];

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
}) => {
  const radius = size / 2 - 10;
  const center = size / 2;
  
  const slices = useMemo(() => {
    if (total <= 0 || data.length === 0) return [];
    
    let currentAngle = -90;
    const result: Array<{path: string; color: string; name: string; value: number; percent: number; labelX: number; labelY: number;}> = [];

    data.forEach((item) => {
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
          {slices.map((slice, index) => {
            const isBigSlice = slice.percent > 15;
            const isSmallSlice = slice.percent > 4; 
            const showText = isSmallSlice;
            const textColor = getTextColor(slice.color);

            return (
              <React.Fragment key={`slice-${slice.name}-${index}`}>
                <Path d={slice.path} fill={slice.color} stroke={isDarkMode ? '#0F172A' : '#FFFFFF'} strokeWidth={1.5} />
                {showText && (
                  <>
                    <SvgText 
                      x={slice.labelX} y={slice.labelY - (isBigSlice ? 14 : 10)} 
                      fontSize={isBigSlice ? 11 : 9} fontWeight="bold" fill={textColor} 
                      textAnchor="middle" alignmentBaseline="middle"
                    >
                      {truncateName(slice.name, isBigSlice ? 12 : 6)}
                    </SvgText>
                    <SvgText 
                      x={slice.labelX} y={slice.labelY} 
                      fontSize={isBigSlice ? 12 : 9} fontWeight="800" fill={textColor} 
                      textAnchor="middle" alignmentBaseline="middle"
                    >
                      {`${Math.round(slice.value).toLocaleString()} ${currency}`}
                    </SvgText>
                    <SvgText 
                      x={slice.labelX} y={slice.labelY + (isBigSlice ? 14 : 10)} 
                      fontSize={isBigSlice ? 10 : 8} fontWeight="600" fill={textColor} 
                      textAnchor="middle" alignmentBaseline="middle" opacity={0.85}
                    >
                      {`${Math.round(slice.percent)}%`}
                    </SvgText>
                  </>
                )}
              </React.Fragment>
            );
          })}
          {innerRadius > 0 && <Circle cx={center} cy={center} r={innerRadius - 5} fill={isDarkMode ? '#1E293B' : '#FFFFFF'} />}
        </G>
      </Svg>
      <View style={{ marginTop: 15, width: '100%' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {slices.map((slice, index) => (
            <View key={`legend-${slice.name}-${index}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: slice.color + '40' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: slice.color, marginRight: 6 }} />
              <Text style={{ fontSize: 11, color: isDarkMode ? '#E5E7EB' : '#374151', fontWeight: '500' }}>{slice.name}</Text>
              <Text style={{ fontSize: 11, color: slice.color, fontWeight: 'bold', marginLeft: 4 }}>{`${Math.round(slice.percent)}%`}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// ============================================
// 📊 GRAPHIQUE LINECHART AVEC ZOOM
// ============================================
interface ChartDataPoint {
  day: number;
  value: number;
  date: Date;
}

interface ZoomableLineChartProps {
  data: ChartDataPoint[];
  height: number;
  activeTheme: any;
  isDarkMode: boolean;
  currency: string;
  onSelectDay: (day: ChartDataPoint | null) => void;
  selectedDay: ChartDataPoint | null;
  zoomLevel: number;
}

const ZoomableLineChart: React.FC<ZoomableLineChartProps> = ({
  data,
  height,
  activeTheme,
  isDarkMode,
  currency,
  onSelectDay,
  selectedDay,
  zoomLevel
}) => {
  const baseDayWidth = 35;
  const dayWidth = baseDayWidth * zoomLevel;
  const chartWidth = data.length * dayWidth;
  
  // Ajuster le padding pour permettre le défilement jusqu'au bout
  const padding = { top: 50, right: 30, bottom: 50, left: 70 };
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data.map(d => d.value), 1000);
  const minValue = 0;
  
  // Identifier la semaine en cours
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  const yGridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => ({
    y: padding.top + chartHeight * (1 - ratio),
    value: Math.round(minValue + (maxValue - minValue) * ratio)
  }));

  const points = data.map((d, i) => ({
    x: padding.left + i * dayWidth + dayWidth / 2,
    y: padding.top + chartHeight - (d.value / maxValue) * chartHeight,
    ...d,
    isThisWeek: isSameDay(d.date, today) || (d.date >= weekStart && d.date <= weekEnd)
  }));

  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
     // Scroll automatique vers aujourd'hui ou la fin du mois
     if(scrollRef.current && points.length > 0) {
        const todayIndex = points.findIndex(p => isSameDay(p.date, new Date()));
        if (todayIndex !== -1) {
           setTimeout(() => {
             scrollRef.current?.scrollTo({ x: Math.max(0, (todayIndex * dayWidth) - (SCREEN_WIDTH / 2) + padding.left), animated: true });
           }, 500);
        }
     }
  }, [data]);

  const generateSmoothPath = () => {
    if (points.length < 2) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const tension = 0.3;
      const cp1x = prev.x + (curr.x - prev.x) * tension;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) * tension;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  const generateAreaPath = () => {
    if (points.length < 2) return '';
    const linePath = generateSmoothPath();
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    return `${linePath} L ${lastPoint?.x} ${padding.top + chartHeight} L ${firstPoint.x} ${padding.top + chartHeight} Z`;
  };

  const formatYValue = (value: number) => {
    if (!value) return '0';
    return value.toLocaleString('fr-FR');
  };

  return (
    <ScrollView 
      ref={scrollRef}
      horizontal 
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={{ paddingVertical: 10 }}
      scrollEventThrottle={16}
    >
      <Svg width={chartWidth + padding.left + padding.right} height={height}>
        <Defs>
          <SvgGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={activeTheme.primary} stopOpacity="0.3" />
            <Stop offset="0.5" stopColor={activeTheme.primary} stopOpacity="0.1" />
            <Stop offset="1" stopColor={activeTheme.primary} stopOpacity="0" />
          </SvgGradient>
          <SvgGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={activeTheme.primary} stopOpacity="1" />
            <Stop offset="1" stopColor={activeTheme.secondary || activeTheme.primary} stopOpacity="1" />
          </SvgGradient>
        </Defs>

        {/* Zone de la semaine en cours supprimée suite demande */}
        
        {yGridLines.map((line, i) => (
          <React.Fragment key={`gridline-${line.value}-${i}`}>
            <Line
              x1={padding.left}
              y1={line.y}
              x2={chartWidth + padding.left}
              y2={line.y}
              stroke={isDarkMode ? '#334155' : '#E2E8F0'}
              strokeWidth="1"
              strokeDasharray={i === 0 ? "0" : "4,4"}
              opacity={0.6}
            />
            <SvgText
              x={padding.left - 8}
              y={line.y + 4}
              fontSize="9"
              fill={isDarkMode ? '#64748B' : '#94A3B8'}
              textAnchor="end"
              fontWeight="500"
            >
              {formatYValue(line.value)}
            </SvgText>
          </React.Fragment>
        ))}

        <Path d={generateAreaPath()} fill="url(#areaGradient)" />
        <Path
          d={generateSmoothPath()}
          stroke="url(#lineGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, i) => {
          const isSelected = selectedDay?.day === point.day;
          const hasValue = point.value > 0;
          
          // Extraire les ternaires imbriquées pour améliorer la lisibilité
          const circleRadius = isSelected ? 8 : (hasValue ? 4 : 2);
          const circleFill = isSelected || hasValue ? activeTheme.primary : 'transparent';
          
          // Séparer les conditions pour éviter les ternaires imbriquées
          let circleStroke: string;
          if (hasValue) {
            circleStroke = isDarkMode ? '#0F172A' : '#fff';
          } else {
            circleStroke = isDarkMode ? '#475569' : '#CBD5E1';
          }
          
          const strokeWidth = isSelected ? 3 : (hasValue ? 2 : 1);
          
          return (
            <React.Fragment key={`point-${point.day}-${i}`}>
              {isSelected && (
                <Line
                  x1={point.x}
                  y1={padding.top}
                  x2={point.x}
                  y2={padding.top + chartHeight}
                  stroke={activeTheme.primary}
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity={0.5}
                />
              )}
              <Circle
                cx={point.x}
                cy={point.y}
                r={circleRadius}
                fill={circleFill}
                stroke={circleStroke}
                strokeWidth={strokeWidth}
                onPress={() => {
                  Vibration.vibrate(10);
                  onSelectDay(isSelected ? null : point);
                }}
              />
              <SvgText
                x={point.x}
                y={height - 12}
                fontSize={zoomLevel >= 1 ? "11" : "9"}
                fill={
                  isSelected || point.isThisWeek 
                    ? activeTheme.primary 
                    : (isDarkMode ? '#94A3B8' : '#64748B')
                }
                textAnchor="middle"
                fontWeight={isSelected || point.isThisWeek ? 'bold' : '500'}
              >
                {point.day}
              </SvgText>
              {isSelected && (
                <>
                  <Rect
                    x={Math.max(point.x - 55, 5)}
                    y={Math.max(point.y - 48, 5)}
                    width="110"
                    height="36"
                    rx="10"
                    fill={isDarkMode ? '#1E293B' : '#fff'}
                    stroke={activeTheme.primary}
                    strokeWidth="2"
                  />
                  <SvgText
                    x={point.x}
                    y={point.y - 26}
                    fontSize="12"
                    fill={activeTheme.primary}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {`${formatMoney(point.value)} ${currency}`}
                  </SvgText>
                </>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </ScrollView>
  );
};

// ============================================
// 🎯 ANIMATED METRIC CARD COMPONENT
// ============================================
interface AnimatedMetricCardProps {
  icon: string;
  iconColor: string;
  value: string | number;
  label: string;
  delay: number;
  activeTheme: any;
  isDarkMode: boolean;
}

const AnimatedMetricCard: React.FC<AnimatedMetricCardProps> = ({
  icon,
  iconColor,
  value,
  label,
  delay,
  activeTheme,
  isDarkMode
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ])
    ]).start();
  }, []);

  const c = { 
    card: isDarkMode ? '#1E293B' : '#FFFFFF', 
    text: isDarkMode ? '#F8FAFC' : '#1E293B', 
    textSec: isDarkMode ? '#94A3B8' : '#64748B'
  };

  return (
    <Animated.View
      style={[
        styles.animatedMetricCard,
        {
          backgroundColor: c.card,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <View style={[styles.metricIconCircle, { backgroundColor: iconColor + '15' }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <Text style={[styles.metricCardValue, { color: c.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.metricCardLabel, { color: c.textSec }]}>{label}</Text>
    </Animated.View>
  );
};

// ============================================
// 🏠 COMPOSANT PRINCIPAL
// ============================================
export default function Rapports() {
  const { activeTheme, isDarkMode } = useTheme();
  const { currency, language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(activeTheme, isDarkMode);

  // --- ÉTATS ---
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [stats, setStats] = useState({
    monthTotal: 0,
    monthItems: 0,
    topProduct: '-',
    topProductQty: 0,
    maxDay: { day: 0, amount: 0 },
    prevMonthTotal: 0
  });

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [selectedChartDay, setSelectedChartDay] = useState<ChartDataPoint | null>(null);
  const [chartZoom, setChartZoom] = useState(1);
  
  // Nouveaux états pour les sections
  const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');
  const [topProductsMode, setTopProductsMode] = useState<'spending' | 'quantity' | 'frequency'>('spending');
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const [showDailyJournal, setShowDailyJournal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [dailyPurchases, setDailyPurchases] = useState<any[]>([]);
  const [dailyTotal, setDailyTotal] = useState(0);

  // États pour les statistiques hebdomadaires
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const headerTotalAnim = useRef(new Animated.Value(0)).current;
  const headerTotalScale = useRef(new Animated.Value(0.8)).current;

  const vibrate = () => Vibration.vibrate(10);

  const zoomIn = () => { vibrate(); setChartZoom(prev => Math.min(prev + 0.3, 2)); };
  const zoomOut = () => { vibrate(); setChartZoom(prev => Math.max(prev - 0.3, 0.5)); };
  const resetZoom = () => { vibrate(); setChartZoom(1); };

  useFocusEffect(
    useCallback(() => {
      loadMonthStats();
      loadWeeklyStats();
      loadChartData();
      loadTrendData();
      loadTopProducts();
      
      // Reset et rejouer les animations
      headerTotalAnim.setValue(0);
      headerTotalScale.setValue(0.8);
      
      Animated.parallel([
        Animated.timing(headerTotalAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(headerTotalScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true })
      ]).start();
    }, [currentMonth, currentWeekStart])
  );

  useEffect(() => {
    setCurrentWeekStart(startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 }));
    setSelectedChartDay(null);
  }, [currentMonth]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true })
    ]).start();
  }, []);

  // ============================================
  // 📊 CHARGEMENT DES DONNÉES
  // ============================================
  function loadMonthStats() {
    try {
      const db = getDb();
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      const [monthRes] = db.getAllSync(`SELECT SUM(l.prixTotal) as t FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat WHERE a.dateAchat BETWEEN ? AND ?`, [start, end]);
      const [itemsRes] = db.getAllSync(`SELECT COUNT(l.idArticle) as q FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat WHERE a.dateAchat BETWEEN ? AND ?`, [start, end]);
      const [topRes] = db.getAllSync(`SELECT p.libelle as libelleProduit, SUM(l.quantite) as q FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat JOIN Produit p ON p.idProduit = l.idProduit WHERE a.dateAchat BETWEEN ? AND ? GROUP BY p.libelle ORDER BY q DESC LIMIT 1`, [start, end]);
      
      const [maxDayRes] = db.getAllSync(`
        SELECT strftime('%d', a.dateAchat) as jour, SUM(l.prixTotal) as total 
        FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat 
        WHERE a.dateAchat BETWEEN ? AND ? 
        GROUP BY jour ORDER BY total DESC LIMIT 1
      `, [start, end]);

      const prevStart = startOfMonth(subMonths(currentMonth, 1)).toISOString();
      const prevEnd = endOfMonth(subMonths(currentMonth, 1)).toISOString();
      const [prevRes] = db.getAllSync(`SELECT SUM(l.prixTotal) as t FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat WHERE a.dateAchat BETWEEN ? AND ?`, [prevStart, prevEnd]);

      setStats({
        monthTotal: (monthRes as any)?.t || 0,
        monthItems: (itemsRes as any)?.q || 0,
        topProduct: (topRes as any)?.libelleProduit || '-',
        topProductQty: (topRes as any)?.q || 0,
        maxDay: { 
          day: Number.parseInt((maxDayRes as any)?.jour) || 0, 
          amount: (maxDayRes as any)?.total || 0 
        },
        prevMonthTotal: (prevRes as any)?.t || 0
      });
    } catch (e) { console.error(e); }
  }

  function loadChartData() {
    setChartLoading(true);
    try {
      const db = getDb();
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      const result = db.getAllSync(`
        SELECT date(a.dateAchat) as jour, SUM(l.prixTotal) as total
        FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat 
        WHERE a.dateAchat BETWEEN ? AND ?
        GROUP BY jour ORDER BY jour ASC
      `, [start, end]);

      const daysInMonth = getDaysInMonth(currentMonth);
      const data: ChartDataPoint[] = [];

      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
        const dayStr = format(date, 'yyyy-MM-dd');
        const match = (result as any[]).find(r => r.jour === dayStr);
        data.push({ day: i, value: match?.total || 0, date });
      }

      setChartData(data);
    } catch (e) { console.error(e); } 
    finally { setChartLoading(false); }
  }



  function loadTrendData() {
    try {
      const db = getDb();
      const currentStart = startOfMonth(currentMonth).toISOString();
      const currentEnd = endOfMonth(currentMonth).toISOString();
      const prevStart = startOfMonth(subMonths(currentMonth, 1)).toISOString();
      const prevEnd = endOfMonth(subMonths(currentMonth, 1)).toISOString();
      
      // Total dépenses
const [currentTotal] = db.getAllSync(`SELECT SUM(l.prixTotal) as total FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat WHERE a.dateAchat BETWEEN ? AND ?`, [currentStart, currentEnd]);
      const [prevTotal] = db.getAllSync(`SELECT SUM(l.prixTotal) as total FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat WHERE a.dateAchat BETWEEN ? AND ?`, [prevStart, prevEnd]);

      // Nombre d'articles
      const [currentItems] = db.getAllSync(`SELECT COUNT(l.idArticle) as count FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat WHERE a.dateAchat BETWEEN ? AND ?`, [currentStart, currentEnd]);
      const [prevItems] = db.getAllSync(`SELECT COUNT(l.idArticle) as count FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat WHERE a.dateAchat BETWEEN ? AND ?`, [prevStart, prevEnd]);
      
      // Prix moyen par article
      const currentAvg = (currentItems as any)?.count > 0 ? (currentTotal as any)?.total / (currentItems as any)?.count : 0;
      const prevAvg = (prevItems as any)?.count > 0 ? (prevTotal as any)?.total / (prevItems as any)?.count : 0;
      
      setTrendData([
        {
          title: 'Total Dépenses',
          currentValue: (currentTotal as any)?.total || 0,
          previousValue: (prevTotal as any)?.total || 0,
          icon: 'wallet-outline'
        },
        {
          title: 'Nombre d\'Articles',
          currentValue: (currentItems as any)?.count || 0,
          previousValue: (prevItems as any)?.count || 0,
          icon: 'cube-outline'
        },
        {
          title: 'Prix Moyen/Article',
          currentValue: currentAvg,
          previousValue: prevAvg,
          icon: 'trending-up-outline'
        }
      ]);
    } catch (e) { console.error(e); }
  }

  function loadTopProducts() {
    try {
      const db = getDb();
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();
      
      const result = db.getAllSync(`
        SELECT 
          p.libelle as name,
          SUM(l.quantite) as quantity,
          SUM(l.prixTotal) as totalSpent,
          COUNT(DISTINCT a.idListe) as frequency
        FROM Article l 
        JOIN ListeAchat a ON a.idListe = l.idListeAchat 
        JOIN Produit p ON p.idProduit = l.idProduit
        WHERE a.dateAchat BETWEEN ? AND ?
        GROUP BY p.libelle
        ORDER BY totalSpent DESC
      `, [start, end]);
      
      setTopProducts(result as any[]);
    } catch (e) { console.error(e); }
  }

  function loadWeeklyStats() {
    try {
      const db = getDb();
      const start = currentWeekStart.toISOString();
      const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 }).toISOString();

      const result = db.getAllSync(`
        SELECT a.dateAchat, l.prixTotal, p.libelle as libelleProduit, l.quantite, l.prixUnitaire, p.unite
        FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat JOIN Produit p ON p.idProduit = l.idProduit
        WHERE a.dateAchat BETWEEN ? AND ? ORDER BY a.dateAchat ASC
      `, [start, end]);

      const daysMap = new Map<string, { total: number, products: any[] }>();
      const days = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) });
      
      for (const day of days) {
        daysMap.set(format(day, 'yyyy-MM-dd'), { total: 0, products: [] });
      }

      let wTotal = 0;
      for (const row of result as any[]) {
        const dateKey = format(new Date(row.dateAchat), 'yyyy-MM-dd');
        const current = daysMap.get(dateKey);
        if (current) {
          current.total += row.prixTotal;
          current.products.push({ 
            name: row.libelleProduit, 
            qty: row.quantite, 
            unitPrice: row.prixUnitaire,
            price: row.prixTotal,
            unite: row.unite 
          });
          wTotal += row.prixTotal;
        }
      }

      setWeeklyStats(days.map(day => ({
        day,
        total: daysMap.get(format(day, 'yyyy-MM-dd'))?.total || 0,
        products: daysMap.get(format(day, 'yyyy-MM-dd'))?.products || []
      })));
      setWeekTotal(wTotal);
    } catch (e) { console.error(e); }
  }

  const loadDailyPurchases = (date: Date) => {
    try {
      const db = getDb();
      const dayStart = format(date, 'yyyy-MM-dd') + 'T00:00:00.000Z';
      const dayEnd = format(date, 'yyyy-MM-dd') + 'T23:59:59.999Z';
      const result = db.getAllSync(`
        SELECT a.nomListe, l.idArticle as ligneId, p.libelle as libelleProduit, l.quantite, l.prixUnitaire, l.prixTotal, p.unite
        FROM Article l JOIN ListeAchat a ON a.idListe = l.idListeAchat JOIN Produit p ON p.idProduit = l.idProduit
        WHERE a.dateAchat BETWEEN ? AND ? ORDER BY a.nomListe ASC, p.libelle ASC
      `, [dayStart, dayEnd]);
      setDailyPurchases(result as any[]);
      setDailyTotal((result as any[]).reduce((sum, p) => sum + (p.prixTotal || 0), 0));
    } catch (e) { console.error(e); }
  };

  const toggleDay = (dateKey: string) => {
    vibrate();
    setExpandedDays((prev: string[]) => prev.includes(dateKey) ? prev.filter((d: string) => d !== dateKey) : [...prev, dateKey]);
  };

  // ============================================
  // 📄 GÉNÉRATION PDF
  // ============================================
  const generateDailyPDF = async () => {
    const dateStr = format(selectedDate, 'EEEE d MMMM yyyy', { locale: language === 'en' ? enUS : fr });
    
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
            <h1 class="title">📋 Journal des Dépenses</h1>
            <p class="date">${dateStr}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Dépensé</div>
              <div class="summary-value">${formatMoney(dailyTotal)} ${currency}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Nombre d'Articles</div>
              <div class="summary-value">${dailyPurchases.length}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 40%">Produit</th>
                <th class="text-center" style="width: 15%">Quantité</th>
                <th class="text-right" style="width: 20%">Prix Unitaire</th>
                <th class="text-right" style="width: 25%">Total</th>
              </tr>
            </thead>
            <tbody>
              ${dailyPurchases.map(p => `
                <tr>
                  <td>${p.libelleProduit}</td>
                  <td class="text-center">${p.quantite} ${p.unite || 'pcs'}</td>
                  <td class="text-right">${formatMoney(p.prixUnitaire || 0)} ${currency}</td>
                  <td class="text-right">${formatMoney(p.prixTotal || 0)} ${currency}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3"><strong>TOTAL GÉNÉRAL</strong></td>
                <td class="text-right"><strong>${formatMoney(dailyTotal)} ${currency}</strong></td>
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
      Alert.alert('Erreur', 'Impossible de générer le PDF');
    }
  };

  const getEvolution = () => {
    if (stats.prevMonthTotal === 0) return null;
    const diff = ((stats.monthTotal - stats.prevMonthTotal) / stats.prevMonthTotal) * 100;
    return { value: Math.abs(diff).toFixed(0), isUp: diff > 0 };
  };

  const evolution = getEvolution();

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      
      {/* ============================================ */}
      {/* 🎨 HEADER AMÉLIORÉ */}
      {/* ============================================ */}
      <LinearGradient 
        colors={activeTheme.gradient as any} 
        style={[s.header, { paddingTop: insets.top + 8 }]}
      >
        {/* Navigation */}
        <View style={s.headerNav}>
          <TouchableOpacity onPress={() => router.push('/journal')} style={s.backBtn}>
            <Ionicons name="book-outline" size={22} color="#fff" />
          </TouchableOpacity>
          
          {/* Sélecteur de mois au centre avec année mise en évidence */}
          <View style={s.monthSelector}>
            <TouchableOpacity onPress={() => { vibrate(); setCurrentMonth(subMonths(currentMonth, 1)); }} style={s.monthArrow}>
              <Ionicons name="chevron-back-outline" size={18} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
            <View style={s.monthDisplay}>
              <Text style={s.monthText}>
                {format(currentMonth, 'MMMM', { locale: language === 'en' ? enUS : fr })}
              </Text>
              <Text style={[s.monthText, { fontSize: 18, fontWeight: '800', color: 'rgba(255,255,255,0.95)', marginTop: 2 }]}>
                {format(currentMonth, 'yyyy')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => { vibrate(); setCurrentMonth(addMonths(currentMonth, 1)); }} style={s.monthArrow}>
              <Ionicons name="chevron-forward-outline" size={18} color="rgba(255,255,255,0.9)" />
            </TouchableOpacity>
          </View>
          
          {/* Bouton pour navigation rapide par année */}
          <TouchableOpacity 
            onPress={() => setShowYearPicker(true)} 
            style={[s.backBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
          >
            <Ionicons name="calendar-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Total principal avec animation */}
        <Animated.View 
          style={[
            s.mainTotal,
            {
              opacity: headerTotalAnim,
              transform: [{ scale: headerTotalScale }]
            }
          ]}
        >
          <Text style={s.mainTotalLabel}>Total des dépenses</Text>
          <View style={s.mainTotalRow}>
            <Text style={s.mainTotalValue}>
              {formatMoney(stats.monthTotal)}
              <Text style={s.currencySmall}> {currency}</Text>
            </Text>
            
            {evolution && (
              <View style={[s.evolutionBadge, { backgroundColor: evolution.isUp ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)' }]}>
                <Ionicons 
                  name={evolution.isUp ? 'trending-up-outline' : 'trending-down-outline'} 
                  size={14} 
                  color={evolution.isUp ? '#FCA5A5' : '#6EE7B7'} 
                />
                <Text style={{ color: evolution.isUp ? '#FCA5A5' : '#6EE7B7', fontSize: 12, fontWeight: '700' }}>
                  {`${evolution.value}%`}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Cards métriques animées dans le header */}
        <View style={s.metricsRow}>
          <AnimatedMetricCard
            icon="cube-outline"
            iconColor={activeTheme.primary}
            value={stats.monthItems}
            label={t('articles')}
            delay={100}
            activeTheme={activeTheme}
            isDarkMode={isDarkMode}
          />
          <AnimatedMetricCard
            icon="calendar-outline"
            iconColor="#F59E0B"
            value={stats.maxDay.day > 0 ? `${stats.maxDay.day}` : '-'}
            label="Jour max"
            delay={200}
            activeTheme={activeTheme}
            isDarkMode={isDarkMode}
          />
          <AnimatedMetricCard
            icon="star-outline"
            iconColor="#10B981"
            value={stats.topProduct.length > 6 ? stats.topProduct.slice(0, 6) + '..' : stats.topProduct}
            label="Top produit"
            delay={300}
            activeTheme={activeTheme}
            isDarkMode={isDarkMode}
          />
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        style={[{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* ============================================ */}
        {/* 📊 GRAPHIQUE AVEC CONTRÔLES DE ZOOM */}
        {/* ============================================ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}> Évolution Mensuelle</Text>
            
            <View style={s.zoomControls}>
              <TouchableOpacity onPress={zoomOut} style={[s.zoomBtn, { opacity: chartZoom <= 0.5 ? 0.4 : 1 }]} disabled={chartZoom <= 0.5}>
                <Ionicons name="remove-outline" size={18} color={activeTheme.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={resetZoom} style={s.zoomResetBtn}>
                <Text style={[s.zoomResetText, { color: activeTheme.primary }]}>
                  {`${Math.round(chartZoom * 100)}%`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={zoomIn} style={[s.zoomBtn, { opacity: chartZoom >= 2 ? 0.4 : 1 }]} disabled={chartZoom >= 2}>
                <Ionicons name="add-outline" size={18} color={activeTheme.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={s.chartCard}>
            {chartLoading ? (
              <View style={{ height: 260, justifyContent: 'center' }}>
                <ActivityIndicator color={activeTheme.primary} size="large" />
              </View>
            ) : (
              <>
                <ZoomableLineChart
                  data={chartData}
                  height={260}
                  activeTheme={activeTheme}
                  isDarkMode={isDarkMode}
                  currency={currency}
                  selectedDay={selectedChartDay}
                  onSelectDay={setSelectedChartDay}
                  zoomLevel={chartZoom}
                />
                
                {selectedChartDay && (
                  <View style={[s.selectedDayInfo, { borderColor: activeTheme.primary + '30' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[s.selectedDayIcon, { backgroundColor: activeTheme.primary + '20' }]}>
                        <Ionicons name="calendar-outline" size={20} color={activeTheme.primary} />
                      </View>
                      <View>
                        <Text style={s.selectedDayDate}>
                          {format(selectedChartDay.date, 'EEEE d MMMM', { locale: fr })}
                        </Text>
                        <Text style={[s.selectedDayAmount, { color: activeTheme.primary }]}>
                          {selectedChartDay.value > 0 ? `${formatMoney(selectedChartDay.value)} ${currency}` : 'Aucune dépense'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedChartDay(null)}>
                      <Ionicons name="close-circle-outline" size={26} color={isDarkMode ? '#64748B' : '#94A3B8'} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
          
          <Text style={s.chartHint}>
            ← Glissez pour voir tous les jours • Touchez un point pour les détails →
          </Text>
        </View>

        {/* ============================================ */}
        {/* 🔧 BOUTONS D'ACTIONS - Repositionnés après le graphique */}
        {/* ============================================ */}
        <View style={s.actionsRow}>
          <TouchableOpacity 
            style={[s.actionCard, { flex: 1 }]}
            onPress={() => { vibrate(); router.push('/analyse_produit'); }}
            activeOpacity={0.8}
          >
            <View style={[s.actionIconBg, { backgroundColor: activeTheme.primary + '15' }]}>
              <Ionicons name="barcode-outline" size={28} color={activeTheme.primary} />
            </View>
            <Text style={s.actionTitle}>{t('product_analysis')}</Text>
            <Text style={s.actionSub}>{t('details_by_item')}</Text>
            <View style={[s.actionArrow, { backgroundColor: activeTheme.primary }]}>
              <Ionicons name="arrow-forward-outline" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.actionCard, { flex: 1 }]}
            onPress={() => { vibrate(); router.push('/statistiques'); }}
            activeOpacity={0.8}
          >
            <View style={[s.actionIconBg, { backgroundColor: activeTheme.primary + '15' }]}>
              <Ionicons name="pie-chart-outline" size={28} color={activeTheme.primary} />
            </View>
            <Text style={s.actionTitle}>Graphiques</Text>
            <Text style={s.actionSub}>{t('detailed_visuals')}</Text>
            <View style={[s.actionArrow, { backgroundColor: activeTheme.primary }]}>
              <Ionicons name="arrow-forward-outline" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ============================================ */}
        {/* � SECTION TENDANCES */}
        {/* ============================================ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}> Tendances</Text>
          </View>
          {trendData.map((trend, index) => (
            <TrendCard
              key={`trend-${trend.title}-${index}`}
              title={trend.title}
              currentValue={trend.currentValue}
              previousValue={trend.previousValue}
              currency={currency}
              icon={trend.icon}
              isDarkMode={isDarkMode}
              activeTheme={activeTheme}
            />
          ))}
        </View>

        {/* ============================================ */}
        {/* 🏆 SECTION TOP PRODUITS */}
        {/* ============================================ */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}> Top Produits</Text>
            <View style={{ flexDirection: 'row', backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', padding: 2, borderRadius: 10 }}>
              {(['spending', 'quantity', 'frequency'] as const).map((mode) => (
                <TouchableOpacity 
                  key={mode}
                  onPress={() => setTopProductsMode(mode)} 
                  style={{ 
                    paddingHorizontal: 8, 
                    paddingVertical: 4, 
                    borderRadius: 8, 
                    backgroundColor: topProductsMode === mode ? activeTheme.primary : 'transparent' 
                  }}
                >
                  <Text style={{ 
                    color: topProductsMode === mode ? '#fff' : (isDarkMode ? '#94A3B8' : '#64748B'), 
                    fontWeight: '600', 
                    fontSize: 11 
                  }}>
                    {mode === 'spending' ? 'Dépenses' : mode === 'quantity' ? 'Quantité' : 'Fréquence'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <ProductRanking
            products={topProducts}
            currency={currency}
            isDarkMode={isDarkMode}
            activeTheme={activeTheme}
            mode={topProductsMode}
          />
        </View>
        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      <Modal visible={showDailyJournal} animationType="slide" transparent onRequestClose={() => setShowDailyJournal(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalContainer}>
            <View style={s.modalHandle} />
            
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>📋 {t('daily_journal')}</Text>
                <TouchableOpacity style={s.dateBtn} onPress={() => setShowDatePicker(true)}>
                  <Ionicons name="calendar-outline" size={16} color={activeTheme.primary} />
                  <Text style={[s.dateBtnText, { color: activeTheme.primary }]}>
                    {format(selectedDate, 'EEEE d MMMM yyyy', { locale: language === 'en' ? enUS : fr })}
                  </Text>
                  <Ionicons name="chevron-down-outline" size={14} color={activeTheme.primary} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                  onPress={generateDailyPDF} 
                  style={[s.pdfBtn, { backgroundColor: activeTheme.primary, opacity: dailyPurchases.length === 0 ? 0.5 : 1 }]}
                  disabled={dailyPurchases.length === 0}
                >
                  <Ionicons name="download-outline" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDailyJournal(false)} style={s.modalClose}>
                  <Ionicons name="close-outline" size={22} color={isDarkMode ? '#F1F5F9' : '#1E293B'} />
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker 
                value={selectedDate} 
                mode="date" 
                display="default" 
                onChange={(e, d) => { setShowDatePicker(false); if(d) { setSelectedDate(d); loadDailyPurchases(d); }}} 
                maximumDate={new Date()} 
              />
            )}

            <View style={s.modalSummary}>
              <View style={s.modalSummaryItem}>
                <View style={[s.modalSummaryIcon, { backgroundColor: activeTheme.primary + '15' }]}>
                  <Ionicons name="wallet-outline" size={22} color={activeTheme.primary} />
                </View>
                <View>
                  <Text style={s.modalSummaryLabel}>{t('total_spent')}</Text>
                  <Text style={[s.modalSummaryValue, { color: activeTheme.primary }]}>{`${formatMoney(dailyTotal)} ${currency}`}</Text>
                </View>
              </View>
              <View style={s.modalSummaryDivider} />
              <View style={s.modalSummaryItem}>
                <View style={[s.modalSummaryIcon, { backgroundColor: '#10B98115' }]}>
                  <Ionicons name="bag-outline" size={22} color="#10B981" />
                </View>
                <View>
                  <Text style={s.modalSummaryLabel}>{t('articles')}</Text>
                  <Text style={[s.modalSummaryValue, { color: '#10B981' }]}>{dailyPurchases.length}</Text>
                </View>
              </View>
            </View>

            {dailyPurchases.length > 0 && (
              <View style={[s.tableHeader, { backgroundColor: activeTheme.primary }]}>
                <Text style={[s.tableHeaderText, { flex: 2 }]}>Produit</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qté</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>P.U</Text>
                <Text style={[s.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Total</Text>
              </View>
            )}

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {dailyPurchases.length === 0 ? (
                <View style={s.emptyState}>
                  <View style={s.emptyIcon}>
                    <Ionicons name="cart-outline" size={50} color="#94A3B8" />
                  </View>
                  <Text style={s.emptyText}>{t('no_purchase')}</Text>
                  <Text style={s.emptySubText}>Aucun achat enregistré pour cette date</Text>
                </View>
              ) : (
                dailyPurchases.map((item, idx) => (
                  <View key={`purchase-${item.ligneId}-${idx}`} style={s.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={s.tableCellName} numberOfLines={2}>
                        {item.libelleProduit}
                      </Text>
                    </View>
                    <Text style={[s.tableCell, { flex: 1, textAlign: 'center' }]}>
                      {item.quantite} {item.unite || ''}
                    </Text>
                    <Text style={[s.tableCell, { flex: 1, textAlign: 'right' }]}>
                      {formatMoney(item.prixUnitaire || 0)}
                    </Text>
                    <Text style={[s.tableCellTotal, { flex: 1, textAlign: 'right', color: activeTheme.primary }]}>
                      {formatMoney(item.prixTotal || 0)}
                    </Text>
                  </View>
                ))
              )}
              <View style={{ height: 20 }} />
            </ScrollView>

            {dailyPurchases.length > 0 && (
              <View style={s.modalFooter}>
                <Text style={s.modalFooterLabel}>TOTAL GÉNÉRAL</Text>
                <Text style={[s.modalFooterValue, { color: activeTheme.primary }]}>{`${formatMoney(dailyTotal)} ${currency}`}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================ */}
      {/* 🧭 NAVIGATION */}
      {/* ============================================ */}
      <View style={[s.navbar, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity onPress={() => router.push('/')} style={s.navItem}>
          <Ionicons name="home-outline" size={24} color="#94A3B8" />
          <Text style={s.navText}>{t('home')}</Text>
        </TouchableOpacity>
        
        <View style={{ marginTop: -30 }}>
          <TouchableOpacity 
            style={[s.fab, { shadowColor: activeTheme.primary }]}
            onPress={() => { 
              vibrate();
              const db = getDb(); 
              const res = db.runSync('INSERT INTO ListeAchat (nomListe, dateAchat) VALUES (?, ?)', ['Nouvelle Liste', new Date().toISOString()]); 
              router.push(`/achat/${res.lastInsertRowId}`); 
            }}
          >
            <LinearGradient colors={activeTheme.gradient as any} style={s.fabGradient}>
              <Ionicons name="add-outline" size={30} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={s.navItem}>
          <Ionicons name="pie-chart" size={24} color={activeTheme.primary} />
          <Text style={[s.navText, { color: activeTheme.primary }]}>{t('reports')}</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Sélecteur d'Année */}
      <Modal visible={showYearPicker} transparent animationType="fade" onRequestClose={() => setShowYearPicker(false)}>
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }} 
          onPress={() => setShowYearPicker(false)} 
          activeOpacity={1}
        >
          <View style={{ width: '80%', backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: isDarkMode ? '#F1F5F9' : '#1E293B', textAlign: 'center', marginBottom: 15 }}>
              Sélectionner l'année
            </Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {(() => {
                const currentYear = new Date().getFullYear();
                const years = [];
                for (let year = currentYear; year >= currentYear - 5; year--) {
                  years.push(year);
                }
                return years.map((year) => {
                  const isSelected = year === currentMonth.getFullYear();
                  return (
                    <TouchableOpacity
                      key={year}
                      onPress={() => {
                        setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
                        setShowYearPicker(false);
                        vibrate();
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: isSelected ? activeTheme.primary + '20' : 'transparent',
                        marginBottom: 8,
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: isSelected ? activeTheme.primary : 'transparent'
                      }}
                    >
                      <Text style={{
                        fontSize: 16,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? activeTheme.primary : (isDarkMode ? '#F1F5F9' : '#1E293B'),
                        textAlign: 'center'
                      }}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowYearPicker(false)}
              style={{
                marginTop: 15,
                padding: 12,
                borderRadius: 12,
                backgroundColor: isDarkMode ? '#334155' : '#E2E8F0'
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: isDarkMode ? '#94A3B8' : '#64748B',
                textAlign: 'center'
              }}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ============================================
// 🎨 STYLES
// ============================================
const styles = StyleSheet.create({
  animatedMetricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricCardValue: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  metricCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

const getStyles = (theme: any, dark: boolean) => {
  const c = { 
    bg: dark ? '#0F172A' : '#F8FAFC', 
    card: dark ? '#1E293B' : '#FFFFFF', 
    text: dark ? '#F8FAFC' : '#1E293B', 
    textSec: dark ? '#94A3B8' : '#64748B', 
    border: dark ? '#334155' : '#E2E8F0'
  };
  
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    
    // HEADER AMÉLIORÉ
    header: { 
      paddingHorizontal: 20, 
      paddingBottom: 20, 
      borderBottomLeftRadius: 30, 
      borderBottomRightRadius: 30 
    },
    headerNav: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center' 
    },
    backBtn: { 
      width: 42, 
      height: 42, 
      borderRadius: 14, 
      backgroundColor: 'rgba(255,255,255,0.15)', 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    
    monthSelector: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: 'rgba(255,255,255,0.15)', 
      borderRadius: 14, 
      paddingVertical: 6, 
      paddingHorizontal: 4 
    },
    monthArrow: { padding: 6 },
    monthDisplay: { minWidth: 120, alignItems: 'center' },
    monthText: { 
      color: '#fff', 
      fontSize: 14, 
      fontWeight: '700', 
      textTransform: 'capitalize' 
    },
    
    mainTotal: { 
      alignItems: 'center', 
      marginTop: 16, 
      marginBottom: 16 
    },
    mainTotalLabel: { 
      color: 'rgba(255,255,255,0.8)', 
      fontSize: 11, 
      fontWeight: '600', 
      textTransform: 'uppercase', 
      letterSpacing: 1 
    },
    mainTotalRow: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 12, 
      marginTop: 6 
    },
    mainTotalValue: { 
      color: '#fff', 
      fontSize: 32, 
      fontWeight: '800' 
    },
    currencySmall: { fontSize: 16, fontWeight: '600' },
    evolutionBadge: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 4, 
      paddingHorizontal: 10, 
      paddingVertical: 5, 
      borderRadius: 20 
    },
    
    // METRICS ROW - Dans le header
    metricsRow: { 
      flexDirection: 'row', 
      marginTop: 8,
      marginHorizontal: -4,
    },
    
    // CONTENT
    scrollContent: { paddingTop: 20, paddingHorizontal: 20 },
    
    section: { marginBottom: 25 },
    sectionHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: 12 
    },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: c.text },
    
    // ZOOM CONTROLS
    zoomControls: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: c.card, 
      borderRadius: 12, 
      padding: 4, 
      gap: 4 
    },
    zoomBtn: { 
      width: 32, 
      height: 32, 
      borderRadius: 8, 
      backgroundColor: theme.primary + '15', 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    zoomResetBtn: { 
      paddingHorizontal: 8, 
      height: 32, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    zoomResetText: { fontSize: 12, fontWeight: '700' },
    
    // CHART
    chartCard: { 
      backgroundColor: c.card, 
      borderRadius: 20, 
      padding: 15, 
      paddingBottom: 10, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.05, 
      shadowRadius: 12, 
      elevation: 3 
    },
    chartHint: { 
      textAlign: 'center', 
      fontSize: 11, 
      color: c.textSec, 
      marginTop: 10, 
      fontStyle: 'italic' 
    },
    
    selectedDayInfo: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      marginTop: 12, 
      padding: 14, 
      borderRadius: 14, 
      borderWidth: 1, 
      backgroundColor: dark ? '#0F172A' : '#F8FAFC' 
    },
    selectedDayIcon: { 
      width: 42, 
      height: 42, 
      borderRadius: 12, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    selectedDayDate: { 
      fontSize: 14, 
      fontWeight: '600', 
      textTransform: 'capitalize', 
      color: c.text 
    },
    selectedDayAmount: { fontSize: 18, fontWeight: '800', marginTop: 2 },
    
    // ACTIONS
    actionsRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
    actionCard: { 
      flex: 1, 
      backgroundColor: c.card, 
      borderRadius: 20, 
      padding: 20, 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.05, 
      shadowRadius: 10, 
      elevation: 3,
      position: 'relative'
    },
    actionIconBg: { 
      width: 54, 
      height: 54, 
      borderRadius: 16, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginBottom: 12 
    },
    actionTitle: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 4 },
    actionSub: { fontSize: 11, color: c.textSec },
    actionArrow: { 
      position: 'absolute', 
      top: 15, 
      right: 15, 
      width: 28, 
      height: 28, 
      borderRadius: 14, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    
    // JOURNAL BUTTON
    journalButton: { 
      marginBottom: 25, 
      borderRadius: 22, 
      shadowColor: theme.primary, 
      shadowOffset: { width: 0, height: 6 }, 
      shadowOpacity: 0.25, 
      shadowRadius: 12, 
      elevation: 6 
    },
    journalButtonGradient: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      padding: 6, 
      borderRadius: 22 
    },
    journalIcon: { 
      width: 52, 
      height: 52, 
      borderRadius: 16, 
      backgroundColor: '#fff', 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    journalTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
    journalSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 3 },
    journalArrowBg: { 
      width: 40, 
      height: 40, 
      borderRadius: 20, 
      backgroundColor: 'rgba(255,255,255,0.2)', 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginRight: 10 
    },
    
    // WEEK
    weekNavRow: { flexDirection: 'row', alignItems: 'center' },
    weekNavBtn: { 
      padding: 6, 
      backgroundColor: theme.primary + '15', 
      borderRadius: 8 
    },
    weekNavText: { 
      fontSize: 12, 
      color: c.textSec, 
      fontWeight: '600', 
      marginHorizontal: 10 
    },
    
    weekCard: { 
      backgroundColor: c.card, 
      borderRadius: 20, 
      overflow: 'hidden', 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 2 }, 
      shadowOpacity: 0.05, 
      shadowRadius: 8, 
      elevation: 2 
    },
    weekDayRow: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: 14, 
      paddingHorizontal: 16, 
      borderBottomWidth: 1, 
      borderBottomColor: c.border, 
      flexWrap: 'wrap' 
    },
    weekDayLeft: { width: 50, alignItems: 'center' },
    weekDayName: { 
      fontSize: 11, 
      color: c.textSec, 
      fontWeight: '600', 
      textTransform: 'uppercase' 
    },
    weekDayNum: { fontSize: 18, fontWeight: '700', color: c.text, marginTop: 2 },
    weekDayRight: { 
      flex: 1, 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 10 
    },
    weekBarBg: { 
      flex: 1, 
      height: 6, 
      backgroundColor: c.border, 
      borderRadius: 3, 
      overflow: 'hidden' 
    },
    weekBar: { height: '100%', borderRadius: 3 },
    weekDayAmount: { fontSize: 13, fontWeight: '700', minWidth: 90, textAlign: 'right' },
    
    expandedList: { 
      width: '100%', 
      marginTop: 12, 
      paddingTop: 12, 
      paddingLeft: 60, 
      borderTopWidth: 1, 
      borderTopColor: c.border 
    },
    productRow: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: 10, 
      paddingBottom: 10, 
      borderBottomWidth: 1, 
      borderBottomColor: c.border 
    },
    productName: { fontSize: 14, fontWeight: '600', color: c.text },
    productDetails: { fontSize: 11, color: c.textSec, marginTop: 2 },
    productTotal: { fontSize: 14, fontWeight: '700' },
    
    weekTotalRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      padding: 18 
    },
    weekTotalLabel: { 
      fontSize: 14, 
      fontWeight: '700', 
      color: c.textSec, 
      textTransform: 'uppercase' 
    },
    weekTotalValue: { fontSize: 20, fontWeight: '800' },
    
    // MODAL
    modalBackdrop: { 
      flex: 1, 
      backgroundColor: 'rgba(0,0,0,0.6)', 
      justifyContent: 'flex-end' 
    },
    modalContainer: { 
      backgroundColor: c.card, 
      borderTopLeftRadius: 30, 
      borderTopRightRadius: 30, 
      height: '90%' 
    },
    modalHandle: { 
      width: 40, 
      height: 5, 
      backgroundColor: c.border, 
      borderRadius: 3, 
      alignSelf: 'center', 
      marginTop: 12 
    },
    modalHeader: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start', 
      padding: 20, 
      borderBottomWidth: 1, 
      borderBottomColor: c.border 
    },
    modalTitle: { fontSize: 22, fontWeight: '800', color: c.text },
    modalClose: { 
      width: 42, 
      height: 42, 
      borderRadius: 21, 
      backgroundColor: dark ? '#334155' : '#F1F5F9', 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    pdfBtn: { 
      width: 42, 
      height: 42, 
      borderRadius: 12, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    
    // Nouveau style pour le bouton PDF principal
    pdfExportCard: {
      marginHorizontal: 20,
      marginVertical: 15,
      padding: 20,
      borderRadius: 20,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    pdfIconBg: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pdfExportTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 4,
    },
    pdfExportSub: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '500',
    },
    pdfArrow: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    dateBtnText: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
    
    modalSummary: { 
      flexDirection: 'row', 
      margin: 20, 
      marginBottom: 15, 
      padding: 16, 
      borderRadius: 16, 
      backgroundColor: dark ? '#0F172A' : '#F8FAFC' 
    },
    modalSummaryItem: { 
      flex: 1, 
      flexDirection: 'row', 
      alignItems: 'center', 
      gap: 12 
    },
    modalSummaryIcon: { 
      width: 46, 
      height: 46, 
      borderRadius: 14, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    modalSummaryLabel: { 
      fontSize: 11, 
      fontWeight: '600', 
      textTransform: 'uppercase', 
      color: c.textSec 
    },
    modalSummaryValue: { fontSize: 20, fontWeight: '800', marginTop: 2 },
    modalSummaryDivider: { 
      width: 1, 
      backgroundColor: c.border, 
      marginHorizontal: 15 
    },
    
    // Table
    tableHeader: { 
      flexDirection: 'row', 
      paddingVertical: 12, 
      paddingHorizontal: 20, 
      marginHorizontal: 20, 
      borderRadius: 12 
    },
    tableHeaderText: { 
      color: '#fff', 
      fontSize: 11, 
      fontWeight: '700', 
      textTransform: 'uppercase' 
    },
    tableRow: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: 14, 
      paddingHorizontal: 20, 
      marginHorizontal: 20, 
      borderBottomWidth: 1, 
      borderBottomColor: c.border 
    },
    tableCellName: { fontSize: 14, fontWeight: '600', color: c.text },
    tableCell: { fontSize: 13, color: c.textSec },
    tableCellTotal: { fontSize: 14, fontWeight: '700' },
    
    emptyState: { alignItems: 'center', marginTop: 80 },
    emptyIcon: { 
      width: 100, 
      height: 100, 
      borderRadius: 50, 
      backgroundColor: dark ? '#1E293B' : '#F1F5F9', 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginBottom: 15 
    },
    emptyText: { fontSize: 18, fontWeight: '700', color: c.text },
    emptySubText: { fontSize: 14, color: c.textSec, marginTop: 5 },
    
    modalFooter: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: 20, 
      backgroundColor: dark ? '#0F172A' : '#F8FAFC', 
      borderTopWidth: 1, 
      borderTopColor: c.border 
    },
    modalFooterLabel: { 
      fontSize: 14, 
      fontWeight: '700', 
      textTransform: 'uppercase', 
      color: c.textSec 
    },
    modalFooterValue: { fontSize: 26, fontWeight: '800' },
    
    // NAVBAR
    navbar: { 
      flexDirection: 'row', 
      justifyContent: 'space-around', 
      alignItems: 'center',
      backgroundColor: c.card, 
      borderTopLeftRadius: 25, 
      borderTopRightRadius: 25,
      paddingTop: 15, 
      position: 'absolute', 
      bottom: 0, 
      width: '100%',
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: -4 }, 
      shadowOpacity: 0.05, 
      shadowRadius: 10, 
      elevation: 10 
    },
    navItem: { alignItems: 'center' },
    navText: { fontSize: 11, color: '#94A3B8', marginTop: 4, fontWeight: '600' },
    
    fab: { 
      width: 60, 
      height: 60, 
      borderRadius: 30, 
      shadowOpacity: 0.35, 
      shadowRadius: 10, 
      elevation: 10 
    },
    fabGradient: { 
      width: '100%', 
      height: '100%', 
      borderRadius: 30, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
  });
};