import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Alert,
  ScrollView,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getDb } from '@db/init';
import { COLORS, SECTION_COLORS } from '@constants/colors';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RapportRow {
  id: number;
  nomListe: string;
  d: string;
  montant: number;
  nbProduits: number;
}

interface Statistique {
  totalDepenses: number;
  nombreAchats: number;
  moyenneParAchat: number;
  produitLePlusAchete: string;
  meilleurJour: string;
}

export default function Rapports() {
  const [rows, setRows] = useState<RapportRow[]>([]);
  const [stats, setStats] = useState<Statistique>({
    totalDepenses: 0,
    nombreAchats: 0,
    moyenneParAchat: 0,
    produitLePlusAchete: 'Aucun',
    meilleurJour: 'Aucun'
  });
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadRapports();
  }, []);

  const loadRapports = async () => {
    try {
      setLoading(true);
      const db = getDb();
      
      // Récupération des achats avec calcul des totaux
      const result = db.getAllSync(`
        SELECT 
          a.id,
          a.nomListe,
          a.dateAchat as d,
          COALESCE(SUM(la.quantite * la.prixUnitaire), 0) as montant,
          COUNT(la.id) as nbProduits
        FROM Achat a
        LEFT JOIN LigneAchat la ON a.id = la.idAchat
        GROUP BY a.id, a.nomListe, a.dateAchat
        ORDER BY a.dateAchat DESC
        LIMIT 50
      `);

      setRows(result as RapportRow[]);

      // Calcul des statistiques
      const totalDepenses = result.reduce((sum: number, row: any) => sum + (row.montant || 0), 0);
      const nombreAchats = result.length;
      const moyenneParAchat = nombreAchats > 0 ? totalDepenses / nombreAchats : 0;

      // Produit le plus acheté
      const produitStats = db.getAllSync(`
        SELECT 
          p.libelle,
          SUM(la.quantite) as total_quantite
        FROM LigneAchat la
        JOIN Produit p ON la.idProduit = p.id
        GROUP BY p.libelle
        ORDER BY total_quantite DESC
        LIMIT 1
      `);

      // Meilleur jour (jour avec le plus de dépenses)
      const jourStats = db.getAllSync(`
        SELECT 
          DATE(a.dateAchat) as jour,
          SUM(la.quantite * la.prixUnitaire) as total_jour
        FROM Achat a
        JOIN LigneAchat la ON a.id = la.idAchat
        GROUP BY DATE(a.dateAchat)
        ORDER BY total_jour DESC
        LIMIT 1
      `);

      setStats({
        totalDepenses,
        nombreAchats,
        moyenneParAchat,
        produitLePlusAchete: produitStats.length > 0 ? (produitStats[0] as any).libelle : 'Aucun',
        meilleurJour: jourStats.length > 0 ? format(new Date((jourStats[0] as any).jour), 'dd MMMM yyyy', { locale: fr }) : 'Aucun'
      });

    } catch (error) {
      console.error('Erreur lors du chargement des rapports:', error);
      Alert.alert('Erreur', 'Impossible de charger les rapports');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const csvHeader = 'Date,Liste,Montant,Nb Produits';
      const csvData = [
        csvHeader,
        ...rows.map(row => 
          `${format(new Date(row.d), 'dd/MM/yyyy')},${row.nomListe},${row.montant.toFixed(2)},${row.nbProduits}`
        )
      ].join('\n');

      await Share.share({
        message: csvData,
        title: 'Rapport des dépenses E-tsena',
      });
    } catch (error) {
      console.error('Erreur lors de l\'exportation:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter les données');
    }
  };

  const toggleSort = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    setSortOrder(newOrder);
    const sortedRows = [...rows].sort((a, b) => {
      return newOrder === 'desc' ? 
        new Date(b.d).getTime() - new Date(a.d).getTime() :
        new Date(a.d).getTime() - new Date(b.d).getTime();
    });
    setRows(sortedRows);
  };

  const renderRapportItem = ({ item }: { item: RapportRow }) => (
    <TouchableOpacity 
      style={styles.rapportCard}
      onPress={() => router.push(`/achat/${item.id}`)}
    >
      <View style={styles.rapportHeader}>
        <View style={styles.rapportIcon}>
          <Ionicons name="receipt-outline" size={24} color={SECTION_COLORS.rapports.primary} />
        </View>
        <View style={styles.rapportInfo}>
          <Text style={styles.rapportTitle}>{item.nomListe}</Text>
          <Text style={styles.rapportDate}>
            {format(new Date(item.d), 'dd MMMM yyyy', { locale: fr })}
          </Text>
        </View>
        <View style={styles.rapportStats}>
          <Text style={styles.rapportMontant}>{item.montant.toLocaleString()} Ar</Text>
          <Text style={styles.rapportProduits}>{item.nbProduits} produits</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="analytics" size={60} color={SECTION_COLORS.rapports.primary} />
        <Text style={styles.loadingText}>Chargement des rapports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Rapports</Text>
            <Text style={styles.headerSubtitle}>Analysez vos dépenses</Text>
          </View>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={exportData}
          >
            <Ionicons name="download-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Section Statistiques */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Statistiques générales</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="wallet-outline" size={32} color={SECTION_COLORS.rapports.primary} />
              <Text style={styles.statValue}>{stats.totalDepenses.toLocaleString()} Ar</Text>
              <Text style={styles.statLabel}>Total dépensé</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="bag-outline" size={32} color={SECTION_COLORS.rapports.primary} />
              <Text style={styles.statValue}>{stats.nombreAchats}</Text>
              <Text style={styles.statLabel}>Achats effectués</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="trending-up-outline" size={32} color={SECTION_COLORS.rapports.primary} />
              <Text style={styles.statValue}>{stats.moyenneParAchat.toLocaleString()} Ar</Text>
              <Text style={styles.statLabel}>Moyenne par achat</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="star-outline" size={32} color={SECTION_COLORS.rapports.primary} />
              <Text style={styles.statValue}>{stats.produitLePlusAchete}</Text>
              <Text style={styles.statLabel}>Produit favori</Text>
            </View>
          </View>
          
          <View style={styles.bestDayCard}>
            <Ionicons name="calendar-outline" size={24} color={SECTION_COLORS.rapports.primary} />
            <View style={styles.bestDayInfo}>
              <Text style={styles.bestDayLabel}>Meilleur jour</Text>
              <Text style={styles.bestDayText}>{stats.meilleurJour}</Text>
            </View>
          </View>
        </View>

        {/* Section Liste des achats */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Détail des achats</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={toggleSort} style={styles.sortButton}>
                <Ionicons 
                  name={sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'} 
                  size={20} 
                  color={SECTION_COLORS.rapports.primary} 
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.refreshButton} onPress={loadRapports}>
                <Ionicons name="refresh" size={20} color={SECTION_COLORS.rapports.primary} />
              </TouchableOpacity>
            </View>
          </View>
          
          <FlatList
            data={rows}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRapportItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={64} color={COLORS.textLight} />
                <Text style={styles.emptyText}>Aucun achat trouvé</Text>
                <Text style={styles.emptySubtext}>Créez votre premier achat pour voir les rapports</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => router.push('/nouvel-achat')}
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.emptyButtonText}>Créer un achat</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  
  // Header
  header: {
    backgroundColor: SECTION_COLORS.rapports.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
  },

  // Statistiques
  summarySection: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: SECTION_COLORS.rapports.light,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  bestDayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SECTION_COLORS.rapports.light,
    borderRadius: 12,
    padding: 16,
  },
  bestDayInfo: {
    marginLeft: 16,
    flex: 1,
  },
  bestDayLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  bestDayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // Liste
  listSection: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SECTION_COLORS.rapports.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SECTION_COLORS.rapports.light,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cartes de rapport
  rapportCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rapportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rapportIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: SECTION_COLORS.rapports.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rapportInfo: {
    flex: 1,
  },
  rapportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  rapportDate: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  rapportStats: {
    alignItems: 'flex-end',
  },
  rapportMontant: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SECTION_COLORS.rapports.primary,
  },
  rapportProduits: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // État vide
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SECTION_COLORS.rapports.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
