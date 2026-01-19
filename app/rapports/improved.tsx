import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../src/db/init';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemedStatusBar } from '../../src/components/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Types
interface MonthlyData {
  month: string;
  monthShort: string; // Seulement "Jan", "Fév", etc.
  year: string;
  total: number;
  count: number;
  articles: ArticleDetail[];
}

interface ArticleDetail {
  libelleProduit: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
  unite: string;
}

interface ProductCount {
  nomProduit: string;
  count: number;
  total: number;
  avgPrice: number;
  totalQuantity: number;
}

// Period Selector Component
interface PeriodSelectorProps {
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  cardColor: string;
  textColor: string;
  activeTheme: any;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ 
  selectedPeriod, 
  setSelectedPeriod, 
  cardColor, 
  textColor, 
  activeTheme 
}) => (
  <View style={[styles.periodSelector, { backgroundColor: cardColor }]}>
    {[
      { key: '6months', label: '6 mois' },
      { key: '12months', label: '12 mois' },
      { key: 'all', label: 'Tout' }
    ].map((period) => (
      <TouchableOpacity
        key={period.key}
        style={[
          styles.periodButton,
          selectedPeriod === period.key && {
            backgroundColor: activeTheme.primary,
          }
        ]}
        onPress={() => setSelectedPeriod(period.key)}
      >
        <Text style={[
          styles.periodButtonText,
          { color: selectedPeriod === period.key ? '#FFFFFF' : textColor }
        ]}>
          {period.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// LineChart Interactive Component
interface InteractiveLineChartProps {
  data: MonthlyData[];
  width: number;
  height: number;
  activeTheme: any;
  isDarkMode: boolean;
  onPointPress: (data: MonthlyData) => void;
}

const InteractiveLineChart: React.FC<InteractiveLineChartProps> = ({
  data,
  width,
  height,
  activeTheme,
  isDarkMode,
  onPointPress
}) => {
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  if (data.length === 0) return null;

  // Reverse data pour afficher chronologiquement
  const chartData = [...data].reverse();
  
  const maxValue = Math.max(...chartData.map(d => d.total), 1);
  const minValue = Math.min(...chartData.map(d => d.total), 0);
  const valueRange = maxValue - minValue || 1;

  // Calculer les points
  const points = chartData.map((item, index) => {
    const x = padding + (index * chartWidth) / (chartData.length - 1 || 1);
    const y = padding + chartHeight - ((item.total - minValue) / valueRange) * chartHeight;
    return { x, y, data: item };
  });

  // Créer le path de la ligne
  const linePath = points.map((p, i) => 
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  ).join(' ');

  // Grille horizontale
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = padding + chartHeight * (1 - ratio);
    const value = minValue + valueRange * ratio;
    return { y, value };
  });

  const gridColor = isDarkMode ? '#334155' : '#E2E8F0';
  const textColor = isDarkMode ? '#94A3B8' : '#64748B';

  return (
    <Svg width={width} height={height}>
      <G>
        {/* Lignes de grille */}
        {gridLines.map((line, i) => (
          <G key={`grid-${i}`}>
            <Line
              x1={padding}
              y1={line.y}
              x2={width - padding}
              y2={line.y}
              stroke={gridColor}
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <SvgText
              x={padding - 10}
              y={line.y + 5}
              fontSize="10"
              fill={textColor}
              textAnchor="end"
            >
              {Math.round(line.value / 1000)}k
            </SvgText>
          </G>
        ))}

        {/* Ligne du graphique */}
        <Path
          d={linePath}
          stroke={activeTheme.primary}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points cliquables */}
        {points.map((point, i) => (
          <G key={`point-${i}`}>
            <Circle
              cx={point.x}
              cy={point.y}
              r="6"
              fill="#FFFFFF"
              stroke={activeTheme.primary}
              strokeWidth="3"
              onPress={() => onPointPress(point.data)}
            />
            {/* Labels mois (seulement le mois) */}
            <SvgText
              x={point.x}
              y={height - 10}
              fontSize="11"
              fill={textColor}
              textAnchor="middle"
              fontWeight="500"
            >
              {point.data.monthShort}
            </SvgText>
          </G>
        ))}
      </G>
    </Svg>
  );
};

const RapportsScreen = () => {
  const { activeTheme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [expensiveProducts, setExpensiveProducts] = useState<ProductCount[]>([]);
  const [quantityProducts, setQuantityProducts] = useState<ProductCount[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  
  // Modal pour détails du point cliqué
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMonthData, setSelectedMonthData] = useState<MonthlyData | null>(null);
  
  // Styles dynamiques
  const backgroundColor = isDarkMode ? '#0F172A' : '#F8FAFC';
  const textColor = isDarkMode ? '#F1F5F9' : '#1E293B';
  const cardColor = isDarkMode ? '#1E293B' : '#FFFFFF';
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0';

  // Data loading
  const loadReportsData = async () => {
    try {
      setLoading(true);
      const db = getDb();
      
      // DEBUG: Vérifier si des données existent
      console.log('[RAPPORT] Début chargement des données...');
      const testCount = db.getFirstSync('SELECT COUNT(*) as count FROM ListeAchat') as any;
      console.log('[RAPPORT] Nombre de listes:', testCount?.count);
      const testArticles = db.getFirstSync('SELECT COUNT(*) as count FROM Article') as any;
      console.log('[RAPPORT] Nombre d\'articles:', testArticles?.count);
      
      const now = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case '6months':
          startDate = subMonths(now, 6);
          break;
        case '12months':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = new Date('2020-01-01');
      }

      // Get monthly data avec détails des articles
      const monthlyQuery = `
        SELECT 
          strftime('%Y-%m', LA.dateAchat) as month,
          SUM(COALESCE(A.prixTotal, 0)) as total,
          COUNT(DISTINCT LA.idListe) as count
        FROM ListeAchat LA
        LEFT JOIN Article A ON A.idListeAchat = LA.idListe
        WHERE LA.dateAchat >= ? AND LA.statut = 1
        GROUP BY strftime('%Y-%m', LA.dateAchat)
        ORDER BY month DESC
        LIMIT 12
      `;
      
      const monthlyResult = db.getAllSync(monthlyQuery, [startDate.toISOString()]) as any[];
      
      console.log('[RAPPORT] Résultats mensuels:', monthlyResult.length, monthlyResult);
      
      // Charger les articles pour chaque mois
      const formattedMonthly: MonthlyData[] = [];
      
      for (const row of monthlyResult) {
        const monthDate = new Date(row.month + '-01');
        const monthStart = startOfMonth(monthDate).toISOString();
        const monthEnd = endOfMonth(monthDate).toISOString();
        
        // Récupérer les articles du mois
        const articlesQuery = `
          SELECT 
            A.libelleProduit,
            SUM(COALESCE(A.quantite, 0)) as quantite,
            AVG(COALESCE(A.prixUnitaire, 0)) as prixUnitaire,
            SUM(COALESCE(A.prixTotal, 0)) as prixTotal,
            A.unite
          FROM Article A
          JOIN ListeAchat LA ON LA.idListe = A.idListeAchat
          WHERE LA.dateAchat >= ? AND LA.dateAchat <= ? AND LA.statut = 1
          GROUP BY A.libelleProduit
          ORDER BY prixTotal DESC
        `;
        
        const articles = db.getAllSync(articlesQuery, [monthStart, monthEnd]) as any[];
        
        formattedMonthly.push({
          month: format(monthDate, 'MMMM yyyy', { locale: fr }),
          monthShort: format(monthDate, 'MMM', { locale: fr }),
          year: format(monthDate, 'yyyy'),
          total: Number.parseFloat(row.total) || 0,
          count: Number.parseInt(row.count) || 0,
          articles: articles.map(a => ({
            libelleProduit: a.libelleProduit,
            quantite: Number.parseFloat(a.quantite) || 0,
            prixUnitaire: Number.parseFloat(a.prixUnitaire) || 0,
            prixTotal: Number.parseFloat(a.prixTotal) || 0,
            unite: a.unite || 'pcs'
          }))
        });
      }

      // Get expensive products (produits coûteux)
      const expensiveQuery = `
        SELECT 
          A.libelleProduit as nomProduit,
          COUNT(*) as count,
          SUM(COALESCE(A.prixTotal, 0)) as total,
          AVG(COALESCE(A.prixUnitaire, 0)) as avgPrice,
          SUM(COALESCE(A.quantite, 0)) as totalQuantity
        FROM Article A
        JOIN ListeAchat LA ON LA.idListe = A.idListeAchat
        WHERE LA.dateAchat >= ? AND LA.statut = 1 AND A.prixTotal > 0
        GROUP BY A.libelleProduit
        ORDER BY total DESC
        LIMIT 5
      `;
      
      const expensiveResult = db.getAllSync(expensiveQuery, [startDate.toISOString()]) as any[];
      const formattedExpensive = expensiveResult.map((row: any) => ({
        nomProduit: row.nomProduit || 'Produit inconnu',
        count: Number.parseInt(row.count) || 0,
        total: Number.parseFloat(row.total) || 0,
        avgPrice: Number.parseFloat(row.avgPrice) || 0,
        totalQuantity: Number.parseFloat(row.totalQuantity) || 0
      }));

      // Get quantity products (beaucoup de quantité)
      const quantityQuery = `
        SELECT 
          A.libelleProduit as nomProduit,
          COUNT(*) as count,
          SUM(COALESCE(A.prixTotal, 0)) as total,
          AVG(COALESCE(A.prixUnitaire, 0)) as avgPrice,
          SUM(COALESCE(A.quantite, 0)) as totalQuantity
        FROM Article A
        JOIN ListeAchat LA ON LA.idListe = A.idListeAchat
        WHERE LA.dateAchat >= ? AND LA.statut = 1
        GROUP BY A.libelleProduit
        ORDER BY totalQuantity DESC
        LIMIT 5
      `;
      
      const quantityResult = db.getAllSync(quantityQuery, [startDate.toISOString()]) as any[];
      const formattedQuantity = quantityResult.map((row: any) => ({
        nomProduit: row.nomProduit || 'Produit inconnu',
        count: Number.parseInt(row.count) || 0,
        total: Number.parseFloat(row.total) || 0,
        avgPrice: Number.parseFloat(row.avgPrice) || 0,
        totalQuantity: Number.parseFloat(row.totalQuantity) || 0
      }));

      // Calculate total spent
      const totalQuery = `
        SELECT SUM(COALESCE(A.prixTotal, 0)) as total
        FROM Article A
        JOIN ListeAchat LA ON LA.idListe = A.idListeAchat
        WHERE LA.dateAchat >= ? AND LA.statut = 1
      `;
      
      const totalResult = db.getFirstSync(totalQuery, [startDate.toISOString()]);
      const totalAmount = Number.parseFloat((totalResult as any)?.total) || 0;

      // Update state
      setMonthlyData(formattedMonthly);
      setExpensiveProducts(formattedExpensive);
      setQuantityProducts(formattedQuantity);
      setTotalSpent(totalAmount);
      
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de rapport');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, [selectedPeriod]);

  // Memoized calculations
  const trendData = useMemo(() => {
    if (monthlyData.length < 2) return { trend: 0, isPositive: false };
    
    const current = monthlyData[0]?.total || 0;
    const previous = monthlyData[1]?.total || 0;
    
    if (previous === 0) return { trend: 0, isPositive: false };
    
    const trend = ((current - previous) / previous) * 100;
    return { trend: Math.abs(trend), isPositive: trend < 0 };
  }, [monthlyData]);

  const averageMonthlySpending = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const total = monthlyData.reduce((sum, month) => sum + month.total, 0);
    return total / monthlyData.length;
  }, [monthlyData]);

  // Handle point click
  const handlePointClick = (data: MonthlyData) => {
    setSelectedMonthData(data);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ThemedStatusBar />
        <View style={[styles.loadingContainer, { paddingTop: insets.top + 60 }]}>
          <ActivityIndicator size="large" color={activeTheme.primary} />
          <Text style={[styles.loadingText, { color: textColor }]}>
            Génération du rapport...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <ThemedStatusBar />
      
      {/* Header */}
      <LinearGradient
        colors={[activeTheme.primary, activeTheme.secondary] as [string, string]}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rapports Détaillés</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Period Selector */}
        <PeriodSelector 
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          cardColor={cardColor}
          textColor={textColor}
          activeTheme={activeTheme}
        />

        {/* Budget Overview */}
        <View style={[styles.summaryCard, { backgroundColor: cardColor, borderColor }]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="wallet-outline" size={24} color={activeTheme.primary} />
            <Text style={[styles.summaryTitle, { color: textColor }]}>Vue d'ensemble</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textColor }]}>Total dépensé</Text>
            <Text style={[styles.summaryValue, { color: activeTheme.primary }]}>
              {Math.round(totalSpent).toLocaleString('fr-FR')} Ar
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textColor }]}>Moyenne mensuelle</Text>
            <Text style={[styles.summaryValue, { color: activeTheme.primary }]}>
              {Math.round(averageMonthlySpending).toLocaleString('fr-FR')} Ar
            </Text>
          </View>
        </View>

        {/* Trend Analysis */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            📈 Analyse des Tendances
          </Text>
          <View style={[styles.trendCard, { 
            backgroundColor: trendData.isPositive ? '#ECFDF5' : '#FEF2F2',
            borderColor: trendData.isPositive ? '#10B981' : '#EF4444'
          }]}>
            <View style={styles.trendIconContainer}>
              <Ionicons 
                name={trendData.isPositive ? "trending-down" : "trending-up"} 
                size={32} 
                color={trendData.isPositive ? '#10B981' : '#EF4444'} 
              />
            </View>
            <View style={styles.trendContent}>
              <Text style={[styles.trendPercent, { 
                color: trendData.isPositive ? '#10B981' : '#EF4444' 
              }]}>
                {trendData.trend.toFixed(1)}%
              </Text>
              <Text style={[styles.trendLabel, { 
                color: trendData.isPositive ? '#059669' : '#DC2626' 
              }]}>
                {trendData.isPositive ? "Réduction" : "Augmentation"} vs mois précédent
              </Text>
            </View>
          </View>
        </View>

        {/* Interactive LineChart */}
        {monthlyData.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.chartHeader}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                📊 Évolution Mensuelle
              </Text>
              <View style={[styles.infoChip, { backgroundColor: activeTheme.primary + '20' }]}>
                <Ionicons name="information-circle" size={16} color={activeTheme.primary} />
                <Text style={[styles.infoChipText, { color: activeTheme.primary }]}>
                  Cliquez sur un point
                </Text>
              </View>
            </View>
            <View style={[styles.chartCard, { backgroundColor: cardColor, borderColor }]}>
              <InteractiveLineChart
                data={monthlyData}
                width={SCREEN_WIDTH - 40}
                height={250}
                activeTheme={activeTheme}
                isDarkMode={isDarkMode}
                onPointPress={handlePointClick}
              />
            </View>
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: cardColor, borderColor }]}>
            <Ionicons name="analytics-outline" size={64} color={textColor + '40'} />
            <Text style={[styles.emptyTitle, { color: textColor }]}>Aucune donnée disponible</Text>
            <Text style={[styles.emptyText, { color: textColor + '80' }]}>
              Créez des listes d'achat pour voir vos statistiques
            </Text>
          </View>
        )}

        {/* Produits Coûteux */}
        {expensiveProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              💰 Produits les Plus Coûteux
            </Text>
            <View style={[styles.productCard, { backgroundColor: cardColor, borderColor }]}>
              {expensiveProducts.map((product, index) => (
                <View key={`expensive-${index}`} style={[styles.productRow, { borderBottomColor: borderColor }]}>
                  <View style={styles.productRank}>
                    <Text style={[styles.productRankText, { color: activeTheme.primary }]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: textColor }]}>
                      {product.nomProduit}
                    </Text>
                    <Text style={[styles.productMeta, { color: textColor + '80' }]}>
                      {product.count} achats • {product.totalQuantity.toFixed(0)} unités
                    </Text>
                  </View>
                  <Text style={[styles.productTotal, { color: activeTheme.primary }]}>
                    {Math.round(product.total).toLocaleString('fr-FR')} Ar
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Produits en Quantité */}
        {quantityProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              📦 Produits en Grande Quantité
            </Text>
            <View style={[styles.productCard, { backgroundColor: cardColor, borderColor }]}>
              {quantityProducts.map((product, index) => (
                <View key={`quantity-${index}`} style={[styles.productRow, { borderBottomColor: borderColor }]}>
                  <View style={styles.productRank}>
                    <Text style={[styles.productRankText, { color: '#10B981' }]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, { color: textColor }]}>
                      {product.nomProduit}
                    </Text>
                    <Text style={[styles.productMeta, { color: textColor + '80' }]}>
                      {product.totalQuantity.toFixed(0)} unités • {product.count} achats
                    </Text>
                  </View>
                  <Text style={[styles.productQuantity, { color: '#10B981' }]}>
                    {product.totalQuantity.toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Summary Stats */}
        <View style={[styles.summaryCard, { backgroundColor: cardColor, borderColor }]}>
          <Text style={[styles.summaryTitle, { color: textColor, marginBottom: 16 }]}>
            Statistiques Globales
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textColor }]}>Total des achats</Text>
            <Text style={[styles.summaryValue, { color: activeTheme.primary }]}>
              {monthlyData.reduce((sum, m) => sum + m.count, 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textColor }]}>Produits différents</Text>
            <Text style={[styles.summaryValue, { color: activeTheme.primary }]}>
              {expensiveProducts.length}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: textColor }]}>Dépense moyenne</Text>
            <Text style={[styles.summaryValue, { color: activeTheme.primary }]}>
              {Math.round(averageMonthlySpending).toLocaleString('fr-FR')} Ar
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Modal détails du mois */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: cardColor }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: textColor }]}>
                  {selectedMonthData?.month}
                </Text>
                <Text style={[styles.modalSubtitle, { color: textColor + '80' }]}>
                  Détails des articles
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close-circle" size={32} color={textColor} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalTotalCard, { backgroundColor: activeTheme.primary + '15' }]}>
              <Text style={[styles.modalTotalLabel, { color: textColor }]}>Total du mois</Text>
              <Text style={[styles.modalTotalValue, { color: activeTheme.primary }]}>
                {Math.round(selectedMonthData?.total || 0).toLocaleString('fr-FR')} Ar
              </Text>
              <Text style={[styles.modalTotalCount, { color: textColor + '80' }]}>
                {selectedMonthData?.count} liste(s) d'achat
              </Text>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedMonthData?.articles.map((article, index) => (
                <View 
                  key={`article-${index}`} 
                  style={[styles.articleRow, { borderBottomColor: borderColor }]}
                >
                  <View style={styles.articleInfo}>
                    <Text style={[styles.articleName, { color: textColor }]}>
                      {article.libelleProduit}
                    </Text>
                    <Text style={[styles.articleDetails, { color: textColor + '80' }]}>
                      {article.quantite.toFixed(1)} {article.unite} × {Math.round(article.prixUnitaire)} Ar
                    </Text>
                  </View>
                  <Text style={[styles.articleTotal, { color: activeTheme.primary }]}>
                    {Math.round(article.prixTotal).toLocaleString('fr-FR')} Ar
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  trendIconContainer: {
    marginRight: 16,
  },
  trendContent: {
    flex: 1,
  },
  trendPercent: {
    fontSize: 28,
    fontWeight: '800',
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  productRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  productMeta: {
    fontSize: 12,
  },
  productTotal: {
    fontSize: 16,
    fontWeight: '700',
  },
  productQuantity: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  modalTotalCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTotalLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalTotalValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  modalTotalCount: {
    fontSize: 13,
    marginTop: 4,
  },
  modalScroll: {
    maxHeight: 400,
  },
  articleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  articleInfo: {
    flex: 1,
  },
  articleName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  articleDetails: {
    fontSize: 13,
  },
  articleTotal: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default RapportsScreen;
