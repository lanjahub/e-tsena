import { View, Text, ScrollView, Dimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useEffect, useState } from 'react';
import { getDb } from '@db/init';
import { Ionicons } from '@expo/vector-icons';
import { SECTION_COLORS, COLORS } from '@constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ChartData {
  name: string;
  color: string;
  population: number;
  legendFontColor: string;
  legendFontSize: number;
}

interface CategoryRow {
  name: string;
  color: string;
  montant: number;
}

interface ComparativeData {
  period: string;
  montant: number;
  nbAchats: number;
}

type PeriodFilter = '7days' | '30days' | '90days' | 'all';
type ViewMode = 'repartition' | 'weekly' | 'monthly';

export default function Stats() {
  const [data, setData] = useState<ChartData[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('30days');
  const [totalDepenses, setTotalDepenses] = useState(0);
  const [nbAchats, setNbAchats] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('repartition');
  const [weeklyData, setWeeklyData] = useState<ComparativeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<ComparativeData[]>([]);

  const load = () => {
    const db = getDb();
    
    let dateFilter = '';
    if (period === '7days') {
      dateFilter = `AND a.dateAchat >= datetime('now', '-7 days')`;
    } else if (period === '30days') {
      dateFilter = `AND a.dateAchat >= datetime('now', '-30 days')`;
    } else if (period === '90days') {
      dateFilter = `AND a.dateAchat >= datetime('now', '-90 days')`;
    }

    const rows = db.getAllSync(`
      SELECT p.libelle as name, 
             CASE 
               WHEN p.libelle IN ('Riz', 'Poulet', 'Viande') THEN '#FF6B6B'
               WHEN p.libelle IN ('Huile', 'Lait') THEN '#4ECDC4'
               WHEN p.libelle IN ('Pain', 'Cahier', 'Stylo') THEN '#45B7D1'
               WHEN p.libelle IN ('Tomate', 'Oignon') THEN '#95E1D3'
               ELSE '#FFA07A'
             END as color,
             SUM(l.prixTotal) as montant
      FROM LigneAchat l
      JOIN Produit p ON p.id = l.idProduit
      JOIN Achat a ON a.id = l.idAchat
      WHERE 1=1 ${dateFilter}
      GROUP BY p.id
      ORDER BY montant DESC
    `) as CategoryRow[];
    
    const formatted = rows.map((r: CategoryRow, i: number) => ({
      name: r.name || `Cat ${i+1}`,
      color: r.color || ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'][i % 5],
      population: r.montant ?? 0,
      legendFontColor: '#555',
      legendFontSize: 12
    }));
    
    setData(formatted.length ? formatted : [{ 
      name: 'Aucune donnée', 
      color: '#ddd', 
      population: 1, 
      legendFontColor: '#555', 
      legendFontSize: 12 
    }]);

    // Calculer les totaux
    const total = formatted.reduce((sum, item) => sum + item.population, 0);
    setTotalDepenses(total);

    // Compter le nombre d'achats
    const countResult = db.getAllSync(`
      SELECT COUNT(DISTINCT a.id) as nb
      FROM Achat a
      WHERE 1=1 ${dateFilter}
    `);
    setNbAchats((countResult[0] as any)?.nb ?? 0);

    // Charger les données comparatives
    loadWeeklyData(db);
    loadMonthlyData(db);
  };

  const loadWeeklyData = (db: any) => {
    try {
      const weeks: ComparativeData[] = [];
      for (let i = 0; i < 4; i++) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        
        const result = db.getAllSync(`
          SELECT 
            COALESCE(SUM(la.prixTotal), 0) as montant,
            COUNT(DISTINCT a.id) as nbAchats
          FROM Achat a
          JOIN LigneAchat la ON a.id = la.idAchat
          WHERE DATE(a.dateAchat) BETWEEN DATE(?) AND DATE(?)
        `, [format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')]);
        
        weeks.unshift({
          period: `Sem ${i === 0 ? 'actuelle' : `-${i}`}`,
          montant: (result[0] as any)?.montant || 0,
          nbAchats: (result[0] as any)?.nbAchats || 0,
        });
      }
      setWeeklyData(weeks);
    } catch (error) {
      console.error('Erreur chargement données hebdomadaires:', error);
    }
  };

  const loadMonthlyData = (db: any) => {
    try {
      const months: ComparativeData[] = [];
      for (let i = 0; i < 6; i++) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        
        const result = db.getAllSync(`
          SELECT 
            COALESCE(SUM(la.prixTotal), 0) as montant,
            COUNT(DISTINCT a.id) as nbAchats
          FROM Achat a
          JOIN LigneAchat la ON a.id = la.idAchat
          WHERE DATE(a.dateAchat) BETWEEN DATE(?) AND DATE(?)
        `, [format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd')]);
        
        months.unshift({
          period: format(monthStart, 'MMM', { locale: fr }),
          montant: (result[0] as any)?.montant || 0,
          nbAchats: (result[0] as any)?.nbAchats || 0,
        });
      }
      setMonthlyData(months);
    } catch (error) {
      console.error('Erreur chargement données mensuelles:', error);
    }
  };

  useEffect(() => { load(); }, [period]);

  const getPeriodLabel = () => {
    switch(period) {
      case '7days': return '7 derniers jours';
      case '30days': return '30 derniers jours';
      case '90days': return '90 derniers jours';
      case 'all': return 'Toutes les périodes';
      default: return '';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* En-tête avec dégradé */}
      <LinearGradient
        colors={SECTION_COLORS.statistiques.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Ionicons name="stats-chart" size={28} color="white" />
        <Text style={styles.headerTitle}>Statistiques</Text>
      </LinearGradient>

      {/* Sélecteur de mode de vue */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'repartition' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('repartition')}
        >
          <Ionicons 
            name="pie-chart" 
            size={20} 
            color={viewMode === 'repartition' ? 'white' : SECTION_COLORS.statistiques.primary} 
          />
          <Text style={[styles.viewModeText, viewMode === 'repartition' && styles.viewModeTextActive]}>
            Répartition
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'weekly' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('weekly')}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={viewMode === 'weekly' ? 'white' : SECTION_COLORS.statistiques.primary} 
          />
          <Text style={[styles.viewModeText, viewMode === 'weekly' && styles.viewModeTextActive]}>
            Semaine
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'monthly' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('monthly')}
        >
          <Ionicons 
            name="bar-chart" 
            size={20} 
            color={viewMode === 'monthly' ? 'white' : SECTION_COLORS.statistiques.primary} 
          />
          <Text style={[styles.viewModeText, viewMode === 'monthly' && styles.viewModeTextActive]}>
            Mois
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtres de période (pour vue répartition) */}
      {viewMode === 'repartition' && (
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Période:</Text>
          <View style={styles.periodButtons}>
            <TouchableOpacity
              style={[styles.periodButton, period === '7days' && styles.periodButtonActive]}
              onPress={() => setPeriod('7days')}
            >
              <Text style={[styles.periodButtonText, period === '7days' && styles.periodButtonTextActive]}>
                7j
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, period === '30days' && styles.periodButtonActive]}
              onPress={() => setPeriod('30days')}
            >
              <Text style={[styles.periodButtonText, period === '30days' && styles.periodButtonTextActive]}>
                30j
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, period === '90days' && styles.periodButtonActive]}
              onPress={() => setPeriod('90days')}
            >
              <Text style={[styles.periodButtonText, period === '90days' && styles.periodButtonTextActive]}>
                90j
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, period === 'all' && styles.periodButtonActive]}
              onPress={() => setPeriod('all')}
            >
              <Text style={[styles.periodButtonText, period === 'all' && styles.periodButtonTextActive]}>
                Tout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Carte de résumé */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="cart" size={32} color={SECTION_COLORS.statistiques.primary} />
          <Text style={styles.summaryNumber}>{nbAchats}</Text>
          <Text style={styles.summaryLabel}>Achats</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="cash" size={32} color={SECTION_COLORS.statistiques.primary} />
          <Text style={styles.summaryNumber}>{totalDepenses.toLocaleString()} Ar</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Vue Répartition */}
      {viewMode === 'repartition' && (
        <>
          {/* Graphique */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Répartition par catégorie</Text>
            <Text style={styles.chartSubtitle}>{getPeriodLabel()}</Text>
            
            {data[0]?.name !== 'Aucune donnée' ? (
              <PieChart
                data={data}
                width={Dimensions.get('window').width - 32}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  color: () => SECTION_COLORS.statistiques.primary,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="8"
                absolute
              />
            ) : (
              <View style={styles.emptyChart}>
                <Ionicons name="pie-chart-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>Aucune donnée disponible</Text>
              </View>
            )}
          </View>

          {/* Détails des catégories */}
          {data[0]?.name !== 'Aucune donnée' && data.length > 0 && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Détails par catégorie</Text>
              {data.map((item) => (
                <View key={item.name} style={styles.detailRow}>
                  <View style={styles.detailLeft}>
                    <View style={[styles.colorBadge, { backgroundColor: item.color }]} />
                    <Text style={styles.detailName}>{item.name}</Text>
                  </View>
                  <View style={styles.detailRight}>
                    <Text style={styles.detailAmount}>{item.population.toLocaleString()} Ar</Text>
                    <Text style={styles.detailPercent}>
                      {((item.population / totalDepenses) * 100).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Vue Comparative Hebdomadaire */}
      {viewMode === 'weekly' && (
        <View style={styles.comparativeContainer}>
          <Text style={styles.comparativeTitle}>Évolution hebdomadaire</Text>
          <Text style={styles.comparativeSubtitle}>4 dernières semaines</Text>
          
          {weeklyData.map((week, index) => (
            <View key={index} style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <View style={styles.periodIconContainer}>
                  <Ionicons name="calendar-outline" size={24} color={SECTION_COLORS.statistiques.primary} />
                </View>
                <View style={styles.periodInfo}>
                  <Text style={styles.periodName}>{week.period}</Text>
                  <Text style={styles.periodSubtext}>{week.nbAchats} achats</Text>
                </View>
                <View style={styles.periodAmount}>
                  <Text style={styles.periodMontant}>{week.montant.toLocaleString()} Ar</Text>
                </View>
              </View>
              <View style={styles.periodBarContainer}>
                <View 
                  style={[
                    styles.periodBar, 
                    { 
                      width: `${Math.min(100, (week.montant / Math.max(...weeklyData.map(w => w.montant))) * 100)}%`,
                      backgroundColor: SECTION_COLORS.statistiques.primary 
                    }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Vue Comparative Mensuelle */}
      {viewMode === 'monthly' && (
        <View style={styles.comparativeContainer}>
          <Text style={styles.comparativeTitle}>Évolution mensuelle</Text>
          <Text style={styles.comparativeSubtitle}>6 derniers mois</Text>
          
          {monthlyData.map((month, index) => (
            <View key={index} style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <View style={styles.periodIconContainer}>
                  <Ionicons name="calendar" size={24} color={SECTION_COLORS.statistiques.primary} />
                </View>
                <View style={styles.periodInfo}>
                  <Text style={styles.periodName}>{month.period}</Text>
                  <Text style={styles.periodSubtext}>{month.nbAchats} achats</Text>
                </View>
                <View style={styles.periodAmount}>
                  <Text style={styles.periodMontant}>{month.montant.toLocaleString()} Ar</Text>
                </View>
              </View>
              <View style={styles.periodBarContainer}>
                <View 
                  style={[
                    styles.periodBar, 
                    { 
                      width: `${Math.min(100, (month.montant / Math.max(...monthlyData.map(m => m.montant))) * 100)}%`,
                      backgroundColor: SECTION_COLORS.statistiques.primary 
                    }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Bouton d'export */}
      <TouchableOpacity style={styles.exportButton}>
        <Ionicons name="download-outline" size={20} color="white" />
        <Text style={styles.exportButtonText}>Exporter les statistiques</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondaryUltraLight,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Sélecteur de mode de vue
  viewModeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SECTION_COLORS.statistiques.light,
    gap: 6,
  },
  viewModeButtonActive: {
    backgroundColor: SECTION_COLORS.statistiques.primary,
  },
  viewModeText: {
    fontSize: 13,
    color: SECTION_COLORS.statistiques.primary,
    fontWeight: '600',
  },
  viewModeTextActive: {
    color: 'white',
  },

  // Filtres
  filterContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontWeight: '500',
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: SECTION_COLORS.statistiques.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },
  detailsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  colorBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  detailName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  detailRight: {
    alignItems: 'flex-end',
  },
  detailAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  detailPercent: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  
  // Styles pour vues comparatives
  comparativeContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  comparativeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  comparativeSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  periodCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  periodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SECTION_COLORS.statistiques.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  periodInfo: {
    flex: 1,
  },
  periodName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  periodSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  periodAmount: {
    alignItems: 'flex-end',
  },
  periodMontant: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SECTION_COLORS.statistiques.primary,
  },
  periodBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  periodBar: {
    height: '100%',
    borderRadius: 4,
  },
  
  exportButton: {
    backgroundColor: SECTION_COLORS.statistiques.primary,
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 6,
    shadowColor: SECTION_COLORS.statistiques.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
