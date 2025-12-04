import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, 
  Animated, Dimensions, StatusBar, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { getDb } from '../../src/db/init';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../../src/context/SettingsContext';

const { width } = Dimensions.get('window');

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
    topProductQty: 0
  });

  // États Analyse Période (Supprimé d'ici, déplacé vers analyse_produit.tsx)
  
  const [showPickerStart, setShowPickerStart] = useState(false);
  const [showPickerEnd, setShowPickerEnd] = useState(false);

  // États Rapport Hebdomadaire
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [weeklyStats, setWeeklyStats] = useState<{day: Date, total: number, percentage: number, products: any[]}[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => 
      prev.includes(dateKey) 
        ? prev.filter(d => d !== dateKey)
        : [...prev, dateKey]
    );
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // RECHARGEMENT AUTOMATIQUE (FOCUS)
  useFocusEffect(
    useCallback(() => {
      loadMonthStats();
      loadWeeklyStats();
    }, [currentMonth, currentWeekStart])
  );

  // Sync Journal with Month
  useEffect(() => {
    // When currentMonth changes, reset the week view to the start of that month
    const startOfSelectedMonth = startOfMonth(currentMonth);
    const startOfFirstWeek = startOfWeek(startOfSelectedMonth, { weekStartsOn: 1 });
    setCurrentWeekStart(startOfFirstWeek);
  }, [currentMonth]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();
  }, []);

  // 1. CHARGEMENT DES STATS DU MOIS SÉLECTIONNÉ
  function loadMonthStats() {
    try {
      const db = getDb();
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      // 1. Total Month
      const [monthRes] = db.getAllSync(`
        SELECT SUM(l.prixTotal) as t 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?`, [start, end]);
      
      // 2. Total Items (Simple stat)
      const [itemsRes] = db.getAllSync(`
        SELECT SUM(l.quantite) as q 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?`, [start, end]);

      // 3. Top Product Month
      const [topRes] = db.getAllSync(`
        SELECT l.libelleProduit, SUM(l.quantite) as q 
        FROM LigneAchat l JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?
        GROUP BY l.libelleProduit ORDER BY q DESC LIMIT 1
      `, [start, end]);

      setStats({
        monthTotal: (monthRes as any)?.t || 0,
        monthItems: (itemsRes as any)?.q || 0,
        topProduct: (topRes as any)?.libelleProduit || '-',
        topProductQty: (topRes as any)?.q || 0
      });
    } catch (e) { console.error(e); }
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // 1.5 CHARGEMENT STATS HEBDOMADAIRE
  function loadWeeklyStats() {
    try {
      const db = getDb();
      const start = currentWeekStart.toISOString();
      const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 }).toISOString();

      // Fetch all purchases in the week with products
      const result = db.getAllSync(`
        SELECT a.dateAchat, l.prixTotal, l.libelleProduit, l.quantite
        FROM LigneAchat l 
        JOIN Achat a ON a.id = l.idAchat 
        WHERE a.dateAchat BETWEEN ? AND ?
        ORDER BY a.dateAchat ASC
      `, [start, end]);

      const daysMap = new Map<string, { total: number, products: any[] }>();
      
      const days = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }) });
      days.forEach(day => {
          daysMap.set(format(day, 'yyyy-MM-dd'), { total: 0, products: [] });
      });

      let wTotal = 0;

      result.forEach((row: any) => {
        const dateKey = format(new Date(row.dateAchat), 'yyyy-MM-dd');
        const current = daysMap.get(dateKey);
        if (current) {
            current.total += row.prixTotal;
            current.products.push({ name: row.libelleProduit, qty: row.quantite, price: row.prixTotal });
            wTotal += row.prixTotal;
        }
      });

      // Calculate max for potential usage
      let maxDaily = 0;
      daysMap.forEach(v => { if(v.total > maxDaily) maxDaily = v.total; });

      const stats = days.map(day => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const data = daysMap.get(dateKey);
        return {
          day,
          total: data?.total || 0,
          products: data?.products || [],
          percentage: maxDaily > 0 ? ((data?.total || 0) / maxDaily) : 0
        };
      });

      setWeeklyStats(stats);
      setWeekTotal(wTotal);
    } catch (e) { console.error(e); }
  };

  const prevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const nextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));

  // 3. EXPORT PDF & PARTAGE
  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const startDate = format(currentWeekStart, 'dd MMM yyyy', { locale: language === 'en' ? enUS : fr });
      const endDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: language === 'en' ? enUS : fr });
      
      let daysHtml = '';
      
      weeklyStats.forEach(stat => {
        if (stat.total > 0) {
          const dayDate = format(stat.day, 'EEEE d MMMM', { locale: language === 'en' ? enUS : fr });
          
          let productsHtml = '';
          stat.products.forEach((p: any) => {
            productsHtml += `
              <div class="product-row">
                <span>${p.name} <span style="color: #666; font-size: 0.9em;">(x${p.qty})</span></span>
                <span>${p.price.toLocaleString()} ${currency}</span>
              </div>
            `;
          });

          daysHtml += `
            <div class="day-section">
              <div class="day-header">
                <span>${dayDate}</span>
                <span>${stat.total.toLocaleString()} ${currency}</span>
              </div>
              <div class="products-list">
                ${productsHtml}
              </div>
            </div>
          `;
        }
      });

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
              h1 { color: ${activeTheme.primary}; margin-bottom: 5px; }
              .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
              .subtitle { color: #666; font-size: 14px; }
              .day-section { margin-bottom: 15px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
              .day-header { background-color: #f8f9fa; padding: 12px 15px; font-weight: bold; display: flex; justify-content: space-between; border-bottom: 1px solid #eee; }
              .products-list { padding: 5px 0; }
              .product-row { display: flex; justify-content: space-between; padding: 8px 15px; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
              .product-row:last-child { border-bottom: none; }
              .total-row { font-weight: bold; font-size: 18px; text-align: right; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; color: ${activeTheme.primary}; }
              .footer { margin-top: 50px; text-align: center; color: #999; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${t('daily_journal')}</h1>
              <p class="subtitle">${t('period')}: ${startDate} - ${endDate}</p>
            </div>
            
            ${daysHtml || `<p style="text-align: center; color: #999; margin: 50px 0;">${t('no_data_week')}</p>`}
            
            <div class="total-row">
              Total: ${weekTotal.toLocaleString()} ${currency}
            </div>
            
            <div class="footer">
              Généré par E-Tsena le ${format(new Date(), 'dd/MM/yyyy HH:mm')}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de générer le PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreate = () => {
    const db = getDb();
    const res = db.runSync('INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)', ['Nouvelle Liste', new Date().toISOString()]);
    router.push(`/achat/${res.lastInsertRowId}`);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* --- HEADER COURBÉ AVEC OVERLAPPING --- */}
      <LinearGradient 
        colors={activeTheme.gradient as any} 
        style={[s.header, { paddingTop: insets.top + 10 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <View style={s.headerTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
               <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            
            {/* SÉLECTEUR DE MOIS */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                <TouchableOpacity onPress={prevMonth}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={[s.headerTitle, { minWidth: 120, textAlign: 'center' }]}>
                   {format(currentMonth, 'MMMM yyyy', { locale: language === 'en' ? enUS : fr })}
                </Text>
                <TouchableOpacity onPress={nextMonth}>
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.iconBtn} onPress={handleExportPDF}>
               <Ionicons name="share-outline" size={24} color="#fff" />
            </TouchableOpacity>
        </View>

        {/* OVERLAPPING SUMMARY CARD */}
        <View style={s.summaryRow}>
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('total_spent')}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{stats.monthTotal.toLocaleString()} {currency}</Text>
          </View>
          <View style={s.verticalDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryLabel}>{t('articles')}</Text>
            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{stats.monthItems} pcs</Text>
          </View>
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        contentContainerStyle={s.scrollContent} 
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        
        {/* --- 2. ACTIONS RAPIDES (Style Professionnel & Épuré) --- */}
        <View style={[s.actionsRow, { marginTop: 20 }]}>
           <TouchableOpacity style={[s.actionBtn]} onPress={() => router.push('/analyse_produit')}>
              <View style={s.actionContent}>
                 <View style={s.actionIconBox}>
                    <Ionicons name="search" size={22} color={activeTheme.primary} />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={s.actionTitle}>{t('product_analysis')}</Text>
                    <Text style={s.actionSub}>{t('details_by_item')}</Text>
                 </View>
                 <View style={s.arrowCircle}>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                 </View>
              </View>
           </TouchableOpacity>

           <TouchableOpacity style={[s.actionBtn]} onPress={() => router.push('/statistiques')}>
              <View style={s.actionContent}>
                 <View style={s.actionIconBox}>
                    <Ionicons name="bar-chart" size={22} color={activeTheme.primary} />
                 </View>
                 <View style={{ flex: 1 }}>
                    <Text style={s.actionTitle}>{t('charts')}</Text>
                    <Text style={s.actionSub}>{t('detailed_visuals')}</Text>
                 </View>
                 <View style={s.arrowCircle}>
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                 </View>
              </View>
           </TouchableOpacity>
        </View>

        {/* --- 1. TOP PRODUIT CARD --- */}
        <View style={s.card}>
            <View style={s.cardHeader}>
                <Text style={s.cardTitle}>{t('top_product')}</Text>
                <Ionicons name="ribbon" size={20} color="#F59E0B" />
            </View>
            <Text style={s.cardValue}>{stats.topProduct}</Text>
            <Text style={s.cardSub}>{stats.topProductQty} {t('articles')}</Text>
        </View>

        {/* --- 1.5 RAPPORT HEBDOMADAIRE (Style Moderne) --- */}
        <View style={s.weeklyReportCard}>
           <View style={s.weeklyHeader}>
              <View>
                <Text style={s.weeklyTitle}>{t('daily_journal')}</Text>
                <Text style={s.cardSub}>
                    {format(currentWeekStart, 'dd MMM', { locale: language === 'en' ? enUS : fr })} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: language === 'en' ? enUS : fr })}
                </Text>
              </View>
              <View style={s.weeklyNav}>
                 <TouchableOpacity onPress={prevWeek} style={s.weeklyNavBtn}>
                    <Ionicons name="chevron-back" size={20} color={activeTheme.primary} />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={nextWeek} style={s.weeklyNavBtn}>
                    <Ionicons name="chevron-forward" size={20} color={activeTheme.primary} />
                 </TouchableOpacity>
              </View>
           </View>

           <View style={s.weeklyContent}>
              {weeklyStats.length === 0 ? (
                 <Text style={s.emptyText}>{t('no_data_week')}</Text>
              ) : (
                 <>
                   {/* LISTE DES JOURS AVEC PRODUITS (Timeline Style) */}
                   <View style={s.daysListContainer}>
                      {weeklyStats.map((stat, index) => {
                        const isToday = isSameDay(stat.day, new Date());
                        const hasData = stat.total > 0;
                        const dateKey = format(stat.day, 'yyyy-MM-dd');
                        const isExpanded = expandedDays.includes(dateKey);
                        
                        return (
                        <View key={index} style={s.dayRow}>
                           {/* Timeline Left */}
                           <View style={s.timelineLeft}>
                              <View style={[s.timelineDot, { 
                                borderColor: hasData ? activeTheme.primary : (isDarkMode ? '#334155' : '#E2E8F0'),
                                backgroundColor: isToday ? activeTheme.primary : (isDarkMode ? '#0F172A' : '#fff')
                              }]} />
                              {index !== weeklyStats.length - 1 && <View style={s.timelineLine} />}
                           </View>

                           {/* Content */}
                           <View style={s.dayContent}>
                              <TouchableOpacity 
                                activeOpacity={0.7}
                                onPress={() => hasData && toggleDay(dateKey)}
                                style={[s.dayCard, { borderColor: isToday ? activeTheme.primary : (isDarkMode ? '#334155' : '#F1F5F9') }]}
                              >
                                <View style={s.dayHeader}>
                                    <View>
                                        <Text style={[s.dayLabel, { color: isToday ? activeTheme.primary : (isDarkMode ? '#F1F5F9' : '#334155') }]}>
                                        {format(stat.day, 'EEEE d', { locale: language === 'en' ? enUS : fr })}
                                        </Text>
                                        {hasData && !isExpanded && (
                                            <Text style={{ fontSize: 10, color: '#94A3B8' }}>{stat.products.length} {t('articles')}</Text>
                                        )}
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={[s.dayTotal, { color: hasData ? activeTheme.primary : '#94A3B8' }]}>
                                        {hasData ? `${stat.total.toLocaleString()} ${currency}` : '-'}
                                        </Text>
                                        {hasData && (
                                            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color="#94A3B8" />
                                        )}
                                    </View>
                                </View>
                                
                                {isExpanded && stat.products.length > 0 && (
                                  <View style={s.productList}>
                                    {stat.products.map((p, i) => (
                                      <View key={i} style={s.productRow}>
                                        <Ionicons name="pricetag-outline" size={12} color="#94A3B8" style={{marginTop: 2}} />
                                        <Text style={s.productItem}>
                                          {p.name} <Text style={{color: '#94A3B8'}}>(x{p.qty})</Text>
                                        </Text>
                                        <Text style={s.productPrice}>{p.price.toLocaleString()} {currency}</Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </TouchableOpacity>
                           </View>
                        </View>
                      )})}
                   </View>

                   {/* TOTAL SEMAINE (SANS MOYENNE) */}
                   <View style={s.weekTotalContainer}>
                      <Text style={s.weekTotalLabel}>{t('total_spent')}</Text>
                      <Text style={[s.weekTotalValue, { color: activeTheme.primary }]}>{weekTotal.toLocaleString()} {currency}</Text>
                   </View>
                 </>
              )}
           </View>
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* --- NAVBAR --- */}
      <View style={[s.navbar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10, height: 60 + (insets.bottom > 0 ? insets.bottom : 10) }]}>
         <TouchableOpacity style={s.navItem} onPress={() => router.push('/')}>
            <Ionicons name="home-outline" size={24} color="#9CA3AF" />
            <Text style={[s.navText, { color: "#9CA3AF" }]}>{t('home')}</Text>
         </TouchableOpacity>

         <View style={{ top: -25 }}>
            <TouchableOpacity style={[s.fab, { shadowColor: activeTheme.primary }]} onPress={handleCreate}>
               <LinearGradient colors={activeTheme.gradient as any} style={s.fabGradient}>
                  <Ionicons name="add" size={32} color="#fff" />
               </LinearGradient>
            </TouchableOpacity>
         </View>

         <TouchableOpacity style={s.navItem}>
            <Ionicons name="pie-chart" size={24} color={activeTheme.primary} />
            <Text style={[s.navText, { color: activeTheme.primary }]}>{t('reports')}</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
}

// 🎨 STYLES AVEC OVERLAPPING
const getStyles = (theme: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: dark ? '#0F172A' : '#F8FAFC' },
  
  // HEADER
  header: { paddingBottom: 80, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, position: 'relative', zIndex: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },

  // SUMMARY ROW (Overlapping)
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

  // SCROLL CONTENT
  scrollContent: { paddingHorizontal: 20, paddingTop: 50 }, // Adjusted for overlapping

  // CARDS
  card: {
    backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: dark ? '#F1F5F9' : '#1E293B' },
  cardValue: { fontSize: 22, fontWeight: '800', color: dark ? '#F1F5F9' : '#0F172A' },
  cardSub: { fontSize: 12, color: dark ? '#94A3B8' : '#64748B', marginTop: 4 },

  // ACTIONS
  actionsRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  actionBtn: { 
      flex: 1,
      backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 20, 
      borderWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9',
      shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 2,
      padding: 15
  },
  actionContent: { alignItems: 'center', gap: 10 },
  actionIconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? '#334155' : '#F1F5F9', marginBottom: 5 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: dark ? '#F1F5F9' : '#1E293B', textAlign: 'center' },
  actionSub: { fontSize: 11, color: dark ? '#94A3B8' : '#64748B', textAlign: 'center' },
  arrowCircle: { display: 'none' }, // Hide arrow for grid layout

  // PERIOD CARD
  periodCard: { 
      backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 20, marginBottom: 20, 
      borderWidth: 1, borderColor: dark ? '#334155' : '#E2E8F0',
      shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 3
  },
  periodHeaderSimple: { padding: 20, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9' },
  periodTitleSimple: { fontSize: 18, fontWeight: '800', color: dark ? '#F1F5F9' : '#1E293B' },
  periodDescSimple: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  
  periodBody: { padding: 20 },
  
  dateRow: { 
      flexDirection: 'row', alignItems: 'center', backgroundColor: dark ? '#0F172A' : '#F8FAFC', 
      borderRadius: 12, padding: 5, marginBottom: 20, borderWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9' 
  },
  dateInput: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12 },
  dateDivider: { width: 1, height: '60%', backgroundColor: dark ? '#334155' : '#E2E8F0' },
  dateLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase' },
  dateValue: { fontSize: 14, fontWeight: '700', color: dark ? '#F1F5F9' : '#334155', marginTop: 2 },

  btnAnalyze: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, width: '100%', shadowColor: theme.primary, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },

  // RESULTS
  resultsContainer: { marginTop: 25, borderTopWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9', paddingTop: 20 },
  resultSummary: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, 
      backgroundColor: dark ? '#0F172A' : '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: dark ? '#334155' : '#E2E8F0' 
  },
  resultSummaryLabel: { fontWeight: '600', fontSize: 14, color: dark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' },
  resultSummaryValue: { fontWeight: '800', fontSize: 22 }, // Color handled inline
  
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9' },
  itemIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: dark ? '#334155' : '#F8FAFC' },
  itemTitle: { fontWeight: '600', color: dark ? '#F1F5F9' : '#1E293B', fontSize: 15 },
  itemDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  itemPrice: { fontWeight: '700', color: dark ? '#F1F5F9' : '#0F172A', fontSize: 15 },
  
  emptyText: { textAlign: 'center', color: dark ? '#64748B' : '#94A3B8', fontStyle: 'italic', padding: 20 },
  
  btnPdf: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 20, backgroundColor: dark ? '#1E293B' : '#fff', borderColor: dark ? '#334155' : '#E2E8F0' },

  // NAVBAR
  navbar: { flexDirection: 'row', backgroundColor: dark ? '#1E293B' : '#fff', borderTopWidth: 1, borderColor: dark ? '#334155' : '#eee', justifyContent: 'space-around', paddingTop: 10, paddingHorizontal: 20, position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center' },
  navText: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  fab: { width: 56, height: 56, borderRadius: 28, shadowOpacity: 0.3, elevation: 6 },
    fabGradient: { width: '100%', height: '100%', borderRadius: 28, justifyContent: 'center', alignItems: 'center' },

  // WEEKLY REPORT
  weeklyReportCard: {
    backgroundColor: dark ? '#1E293B' : '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: dark ? 0.2 : 0.05, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9'
  },
  weeklyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  weeklyTitle: { fontSize: 18, fontWeight: '700', color: dark ? '#F1F5F9' : '#1E293B' },
  weeklyNav: { flexDirection: 'row', gap: 8 },
  weeklyNavBtn: { padding: 8, borderRadius: 12, backgroundColor: dark ? '#334155' : '#F1F5F9' },

  weeklyContent: { padding: 5 },
  
  daysListContainer: { marginBottom: 15, marginTop: 10 },
  dayRow: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', width: 30 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: dark ? '#334155' : '#E2E8F0', marginVertical: 2 },
  
  dayContent: { flex: 1, paddingBottom: 15 },
  dayCard: { 
      backgroundColor: dark ? '#0F172A' : '#F8FAFC', 
      borderRadius: 12, padding: 12, 
      borderWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9' 
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayLabel: { fontSize: 14, fontWeight: '600', textTransform: 'capitalize' },
  dayTotal: { fontSize: 14, fontWeight: '700' },
  
  productList: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: dark ? '#334155' : '#E2E8F0', gap: 6 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productItem: { fontSize: 12, color: dark ? '#94A3B8' : '#64748B', flex: 1 },
  productPrice: { fontSize: 12, fontWeight: '600', color: dark ? '#F1F5F9' : '#334155' },

  weekTotalContainer: { 
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
      backgroundColor: dark ? '#0F172A' : '#F8FAFC', padding: 16, borderRadius: 12, 
      borderWidth: 1, borderColor: dark ? '#334155' : '#F1F5F9' 
  },
  weekTotalLabel: { fontWeight: '600', fontSize: 14, color: dark ? '#94A3B8' : '#64748B', textTransform: 'uppercase' },
  weekTotalValue: { fontWeight: '800', fontSize: 18 },
});