import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { format, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../../src/db/init';
import { useTheme } from '../../src/context/ThemeContext';
import { ThemedStatusBar } from '../../src/components/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// Component imports supprimés pour éviter les erreurs

// Period selector component moved outside
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
  <View style={[styleSheet.periodSelector, { backgroundColor: cardColor }]}>
    {[
      { key: '6months', label: '6 mois' },
      { key: '12months', label: '12 mois' },
      { key: 'all', label: 'Tout' }
    ].map((period) => (
      <TouchableOpacity
        key={period.key}
        style={[
          styleSheet.periodButton,
          selectedPeriod === period.key && {
            backgroundColor: activeTheme.primary,
          }
        ]}
        onPress={() => setSelectedPeriod(period.key)}
      >
        <Text style={[
          styleSheet.periodButtonText,
          { color: selectedPeriod === period.key ? '#FFFFFF' : textColor }
        ]}>
          {period.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

interface MonthlyData {
  month: string;
  total: number;
  count: number;
  products: ProductCount[];
}

interface ProductCount {
  nomProduit: string;
  count: number;
  total: number;
  avgPrice: number;
}

const RapportsScreen = () => {
  const { activeTheme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductCount[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('6months'); // 6months, 12months, all
  
  // Styles dynamiques
  const backgroundColor = isDarkMode ? '#0F172A' : '#F8FAFC';
  const textColor = isDarkMode ? '#F1F5F9' : '#1E293B';
  const cardColor = isDarkMode ? '#1E293B' : '#FFFFFF';

  // Data loading
  const loadReportsData = async () => {
    try {
      setLoading(true);
      const db = getDb();
      
      // Calculate date range based on selected period
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
          startDate = new Date('2020-01-01'); // All time
      }

      // Get monthly data
      const monthlyQuery = `
        SELECT 
          strftime('%Y-%m', dateAchat) as month,
          SUM(totalDepense) as total,
          COUNT(*) as count
        FROM achats 
        WHERE dateAchat >= ? AND statut = 1
        GROUP BY strftime('%Y-%m', dateAchat)
        ORDER BY month DESC
        LIMIT 12
      `;
      
      const monthlyResult = db.getAllSync(monthlyQuery, [startDate.toISOString()]);
      const formattedMonthly = monthlyResult.map((row: any) => ({
        month: format(new Date(row.month + '-01'), 'MMM yyyy', { locale: fr }),
        total: Number.parseFloat(row.total) || 0,
        count: Number.parseInt(row.count) || 0,
        products: []
      }));

      // Get top products
      const productsQuery = `
        SELECT 
          p.nomProduit,
          COUNT(*) as count,
          SUM(p.prix * p.quantite) as total,
          AVG(p.prix) as avgPrice
        FROM produits p
        JOIN achats a ON p.achatId = a.id
        WHERE a.dateAchat >= ? AND a.statut = 1
        GROUP BY p.nomProduit
        ORDER BY total DESC
        LIMIT 10
      `;
      
      const productsResult = db.getAllSync(productsQuery, [startDate.toISOString()]);
      const formattedProducts = productsResult.map((row: any) => ({
        nomProduit: row.nomProduit || 'Produit inconnu',
        count: Number.parseInt(row.count) || 0,
        total: Number.parseFloat(row.total) || 0,
        avgPrice: Number.parseFloat(row.avgPrice) || 0
      }));

      // Calculate total spent
      const totalQuery = `
        SELECT SUM(totalDepense) as total
        FROM achats 
        WHERE dateAchat >= ? AND statut = 1
      `;
      
      const totalResult = db.getFirstSync(totalQuery, [startDate.toISOString()]);
      const totalAmount = Number.parseFloat((totalResult as any)?.total) || 0;

      // Update state
      setMonthlyData(formattedMonthly);
      setTopProducts(formattedProducts);
      setTotalSpent(totalAmount);
      
    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error);
      Alert.alert('Erreur', 'Impossible de charger les données de rapport');
    } finally {
      setLoading(false);
    }
  };

  // Effects
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
    return { trend: Math.abs(trend), isPositive: trend < 0 }; // Positive = spending less
  }, [monthlyData]);

  const averageMonthlySpending = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const total = monthlyData.reduce((sum, month) => sum + month.total, 0);
    return total / monthlyData.length;
  }, [monthlyData]);

  // Period selector
  // Supprimé et déplacé en dehors du composant

  if (loading) {
    return (
      <View style={[styleSheet.container, { backgroundColor }]}>
        <ThemedStatusBar />
        <View style={[styleSheet.loadingContainer, { paddingTop: insets.top + 60 }]}>
          <ActivityIndicator size="large" color={activeTheme.primary} />
          <Text style={[styleSheet.loadingText, { color: textColor }]}>
            Génération du rapport...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styleSheet.container, { backgroundColor }]}>
      <ThemedStatusBar />
      
      {/* Header */}
      <LinearGradient
        colors={[activeTheme.primary, activeTheme.secondary] as [string, string]}
        style={[styleSheet.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styleSheet.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styleSheet.headerTitle}>Rapports</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styleSheet.content}
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

        {/* Budget Overview - Simplifié */}
        <View style={[styleSheet.summaryCard, { backgroundColor: cardColor }]}>
          <View style={styleSheet.summaryRow}>
            <Text style={[styleSheet.summaryLabel, { color: textColor }]}>
              Total dépensé
            </Text>
            <Text style={[styleSheet.summaryValue, { color: activeTheme.primary }]}>
              {Math.round(totalSpent).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={styleSheet.summaryRow}>
            <Text style={[styleSheet.summaryLabel, { color: textColor }]}>
              Moyenne mensuelle
            </Text>
            <Text style={[styleSheet.summaryValue, { color: activeTheme.primary }]}>
              {Math.round(averageMonthlySpending).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>

        {/* Trend Analysis - Simplifié */}
        <View style={styleSheet.section}>
          <Text style={[styleSheet.sectionTitle, { color: textColor }]}>
            Analyse des Tendances
          </Text>
          <View style={[styleSheet.summaryCard, { backgroundColor: cardColor }]}>
            <Text style={[styleSheet.summaryLabel, { color: textColor }]}>
              Évolution mensuelle: {trendData.trend.toFixed(1)}%
            </Text>
            <Text style={[styleSheet.summaryValue, { color: trendData.isPositive ? '#10B981' : '#EF4444' }]}>
              {trendData.isPositive ? "Réduction" : "Augmentation"} des dépenses
            </Text>
          </View>
        </View>

        {/* Chart - Simplifié */}
        {monthlyData.length > 0 && (
          <View style={styleSheet.section}>
            <Text style={[styleSheet.sectionTitle, { color: textColor }]}>
              Évolution par Mois
            </Text>
            <View style={[styleSheet.summaryCard, { backgroundColor: cardColor }]}>
              {[...monthlyData].reverse().map((month, index) => (
                <View key={`month-${month.month}-${index}`} style={styleSheet.summaryRow}>
                  <Text style={[styleSheet.summaryLabel, { color: textColor }]}>
                    {month.month}
                  </Text>
                  <Text style={[styleSheet.summaryValue, { color: activeTheme.primary }]}>
                    {Math.round(month.total).toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Products - Simplifié */}
        {topProducts.length > 0 && (
          <View style={styleSheet.section}>
            <Text style={[styleSheet.sectionTitle, { color: textColor }]}>
              Top Produits
            </Text>
            <View style={[styleSheet.summaryCard, { backgroundColor: cardColor }]}>
              {topProducts.slice(0, 5).map((product, index) => (
                <View key={`product-${product.nomProduit}-${index}`} style={styleSheet.summaryRow}>
                  <Text style={[styleSheet.summaryLabel, { color: textColor }]}>
                    {product.nomProduit} ({product.count}x)
                  </Text>
                  <Text style={[styleSheet.summaryValue, { color: activeTheme.primary }]}>
                    {Math.round(product.total).toLocaleString('fr-FR')} FCFA
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Summary Stats */}
        <View style={[styleSheet.summaryCard, { backgroundColor: cardColor }]}>
          <View style={styleSheet.summaryRow}>
            <Text style={[styleSheet.summaryLabel, { color: textColor }]}>
              Total des achats
            </Text>
            <Text style={[styleSheet.summaryValue, { color: activeTheme.primary }]}>
              {monthlyData.reduce((sum, m) => sum + m.count, 0)}
            </Text>
          </View>
          <View style={styleSheet.summaryRow}>
            <Text style={[styleSheet.summaryLabel, { color: textColor }]}>
              Produits différents
            </Text>
            <Text style={[styleSheet.summaryValue, { color: activeTheme.primary }]}>
              {topProducts.length}
            </Text>
          </View>
          <View style={styleSheet.summaryRow}>
            <Text style={[styleSheet.summaryLabel, { color: textColor }]}>
              Dépense moyenne
            </Text>
            <Text style={[styleSheet.summaryValue, { color: activeTheme.primary }]}>
              {Math.round(averageMonthlySpending).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styleSheet = StyleSheet.create({
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
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
});

export default RapportsScreen;