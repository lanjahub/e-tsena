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
          <Text style={styles.rapportMontant}>{item.montant.toFixed(2)} €</Text>
          <Text style={styles.rapportProduits}>{item.nbProduits} produits</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Chargement des rapports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Rapports</Text>
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={exportData}
        >
          <Ionicons name="download-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Section Statistiques */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Statistiques de la période</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="wallet-outline" size={32} color={SECTION_COLORS.rapports.primary} />
              <Text style={styles.statValue}>{stats.totalDepenses.toFixed(2)} €</Text>
              <Text style={styles.statLabel}>Total dépensé</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="bag-outline" size={32} color={SECTION_COLORS.rapports.primary} />
              <Text style={styles.statValue}>{stats.nombreAchats}</Text>
              <Text style={styles.statLabel}>Achats effectués</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="trending-up-outline" size={32} color={SECTION_COLORS.rapports.primary} />
              <Text style={styles.statValue}>{stats.moyenneParAchat.toFixed(2)} €</Text>
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
            <TouchableOpacity onPress={toggleSort} style={styles.sortButton}>
              <Ionicons 
                name={sortOrder === 'desc' ? 'chevron-down' : 'chevron-up'} 
                size={20} 
                color={SECTION_COLORS.rapports.primary} 
              />
            </TouchableOpacity>
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
                <Text style={styles.emptySubtext}>Modifiez la période ou créez un nouvel achat</Text>
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
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: SECTION_COLORS.rapports.primary,
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    flex: 1,
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  exportButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  summarySection: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: SECTION_COLORS.rapports.light,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
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
    padding: 15,
    marginTop: 10,
  },
  bestDayInfo: {
    marginLeft: 15,
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
  listSection: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 15,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sortButton: {
    padding: 5,
  },
  rapportCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
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
    marginRight: 15,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textLight,
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 5,
  },
});
