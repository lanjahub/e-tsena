import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Alert,
  ScrollView,
  Share,
  Modal,
  TextInput,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getDb } from '@db/init';
import { COLORS, SECTION_COLORS, ANIMATIONS } from '@constants/colors';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { fadeScaleIn } from '../../src/utils/animations';

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

interface Transaction {
  id: number;
  dateAchat: string;
  nomListe: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
}

interface Produit {
  id: number;
  libelle: string;
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
  
  // États pour filtres avancés
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [selectedProduit, setSelectedProduit] = useState<number | null>(null);
  const [dateDebut, setDateDebut] = useState<string>('');
  const [dateFin, setDateFin] = useState<string>('');
  const [showProduitPicker, setShowProduitPicker] = useState(false);
  
  // États pour transactions détaillées
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadRapports();
    loadProduits();
  }, []);

  // Animation d'entrée
  useEffect(() => {
    if (!loading) {
      fadeScaleIn(fadeAnim, scaleAnim, ANIMATIONS.duration.normal).start();
    }
  }, [loading]);

  const loadProduits = async () => {
    try {
      const db = getDb();
      // Récupérer les produits depuis la table Produit ET les produits uniques de LigneAchat
      const produitsFromTable = db.getAllSync(`
        SELECT id, libelle FROM Produit ORDER BY libelle ASC
      `) as Produit[];
      
      const produitsFromLignes = db.getAllSync(`
        SELECT DISTINCT libelleProduit as libelle
        FROM LigneAchat
        ORDER BY libelleProduit ASC
      `) as { libelle: string }[];
      
      // Combiner et dédupliquer
      const allProduits = new Map<number, Produit>();
      let maxId = 0;
      
      produitsFromTable.forEach(p => {
        allProduits.set(p.id, p);
        maxId = Math.max(maxId, p.id);
      });
      
      produitsFromLignes.forEach(p => {
        const existing = Array.from(allProduits.values()).find(prod => prod.libelle === p.libelle);
        if (!existing) {
          maxId++;
          allProduits.set(maxId, { id: maxId, libelle: p.libelle });
        }
      });
      
      setProduits(Array.from(allProduits.values()).sort((a, b) => a.libelle.localeCompare(b.libelle)));
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
    }
  };

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
          libelleProduit as libelle,
          SUM(quantite) as total_quantite
        FROM LigneAchat
        GROUP BY libelleProduit
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

  const applyFilters = async () => {
    try {
      setLoading(true);
      const db = getDb();
      
      let query = `
        SELECT 
          a.id,
          a.dateAchat as dateAchat,
          a.nomListe as nomListe,
          la.libelleProduit as produit,
          la.quantite,
          la.prixUnitaire,
          la.prixTotal
        FROM Achat a
        JOIN LigneAchat la ON a.id = la.idAchat
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (selectedProduit !== null) {
        const produitLibelle = produits.find(p => p.id === selectedProduit)?.libelle;
        if (produitLibelle) {
          query += ` AND la.libelleProduit = ?`;
          params.push(produitLibelle);
        }
      }
      
      if (dateDebut) {
        query += ` AND DATE(a.dateAchat) >= DATE(?)`;
        params.push(dateDebut);
      }
      
      if (dateFin) {
        query += ` AND DATE(a.dateAchat) <= DATE(?)`;
        params.push(dateFin);
      }
      
      query += ` ORDER BY a.dateAchat DESC`;
      
      const result = db.getAllSync(query, params);
      setTransactions(result as Transaction[]);
      setShowTransactions(true);
      setShowAdvancedFilters(false);
      
    } catch (error) {
      console.error('Erreur lors du filtrage:', error);
      Alert.alert('Erreur', 'Impossible d\'appliquer les filtres');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedProduit(null);
    setDateDebut('');
    setDateFin('');
    setTransactions([]);
    setShowTransactions(false);
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionIcon}>
          <Ionicons name="cube" size={24} color={SECTION_COLORS.rapports.primary} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionProduit}>{item.produit}</Text>
          <View style={styles.transactionMeta}>
            <Ionicons name="calendar-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.transactionDate}>
              {format(parseISO(item.dateAchat), 'dd MMM yyyy', { locale: fr })}
            </Text>
            <Text style={styles.transactionSeparator}>•</Text>
            <Ionicons name="list-outline" size={12} color={COLORS.textLight} />
            <Text style={styles.transactionListe}>{item.nomListe}</Text>
          </View>
        </View>
        <View style={styles.transactionStats}>
          <Text style={styles.transactionMontant}>{item.prixTotal.toLocaleString()} Ar</Text>
          <Text style={styles.transactionQuantite}>
            {item.quantite} × {item.prixUnitaire.toLocaleString()} Ar
          </Text>
        </View>
      </View>
    </View>
  );

  const renderRapportItem = ({ item }: { item: RapportRow }) => (
    <TouchableOpacity 
      style={styles.rapportCard}
      onPress={() => router.push(`/achat/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.rapportHeader}>
        <View style={styles.rapportIcon}>
          <Ionicons name="receipt" size={28} color="white" />
        </View>
        <View style={styles.rapportInfo}>
          <Text style={styles.rapportTitle}>{item.nomListe}</Text>
          <View style={styles.rapportMeta}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.rapportDate}>
              {format(new Date(item.d), 'dd MMMM yyyy', { locale: fr })}
            </Text>
          </View>
        </View>
        <View style={styles.rapportStats}>
          <Text style={styles.rapportMontant}>{item.montant.toLocaleString()} Ar</Text>
          <View style={styles.rapportBadge}>
            <Ionicons name="cube-outline" size={12} color={SECTION_COLORS.rapports.primary} />
            <Text style={styles.rapportProduits}>{item.nbProduits}</Text>
          </View>
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
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      {/* Header avec dégradé */}
      <LinearGradient
        colors={SECTION_COLORS.rapports.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
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
            style={styles.filterToggleButton}
            onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <Ionicons name="filter" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.exportButton}
            onPress={exportData}
          >
            <Ionicons name="download-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Filtres avancés */}
        {showAdvancedFilters && (
          <View style={styles.advancedFilters}>
            <Text style={styles.filtersTitle}>Filtres avancés</Text>
            
            {/* Sélecteur de produit */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Produit</Text>
              <TouchableOpacity 
                style={styles.filterInput}
                onPress={() => setShowProduitPicker(true)}
              >
                <Text style={[styles.filterInputText, !selectedProduit && styles.filterPlaceholder]}>
                  {selectedProduit 
                    ? produits.find(p => p.id === selectedProduit)?.libelle 
                    : 'Tous les produits'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>

            {/* Date début */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date de début</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={COLORS.textLight}
                value={dateDebut}
                onChangeText={setDateDebut}
              />
            </View>

            {/* Date fin */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date de fin</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="AAAA-MM-JJ"
                placeholderTextColor={COLORS.textLight}
                value={dateFin}
                onChangeText={setDateFin}
              />
            </View>

            {/* Boutons d'action */}
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.filterResetButton}
                onPress={resetFilters}
              >
                <Ionicons name="refresh" size={18} color={SECTION_COLORS.rapports.primary} />
                <Text style={styles.filterResetText}>Réinitialiser</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.filterApplyButton}
                onPress={applyFilters}
              >
                <Ionicons name="checkmark" size={18} color="white" />
                <Text style={styles.filterApplyText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Affichage des transactions filtrées */}
        {showTransactions && transactions.length > 0 && (
          <View style={styles.transactionsSection}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Transactions ({transactions.length})</Text>
              <TouchableOpacity onPress={() => setShowTransactions(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={transactions}
              keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={renderTransactionItem}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Section Statistiques */}
        {!showTransactions && (
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
        )}

        {/* Section Liste des achats */}
        {!showTransactions && (
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
        )}
      </ScrollView>

      {/* Modal de sélection de produit */}
      <Modal
        visible={showProduitPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProduitPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un produit</Text>
              <TouchableOpacity onPress={() => setShowProduitPicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.produitItem}
              onPress={() => {
                setSelectedProduit(null);
                setShowProduitPicker(false);
              }}
            >
              <Ionicons name="apps" size={20} color={COLORS.textLight} />
              <Text style={styles.produitItemText}>Tous les produits</Text>
              {selectedProduit === null && (
                <Ionicons name="checkmark" size={20} color={SECTION_COLORS.rapports.primary} />
              )}
            </TouchableOpacity>
            
            <FlatList
              data={produits}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.produitItem}
                  onPress={() => {
                    setSelectedProduit(item.id);
                    setShowProduitPicker(false);
                  }}
                >
                  <Ionicons name="cube" size={20} color={SECTION_COLORS.rapports.primary} />
                  <Text style={styles.produitItemText}>{item.libelle}</Text>
                  {selectedProduit === item.id && (
                    <Ionicons name="checkmark" size={20} color={SECTION_COLORS.rapports.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </Animated.View>
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
  
  // Header avec dégradé
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  filterToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Content
  content: {
    flex: 1,
  },

  // Filtres avancés
  advancedFilters: {
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  filterInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  filterInputText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  filterPlaceholder: {
    color: COLORS.textLight,
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  filterResetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SECTION_COLORS.rapports.light,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterResetText: {
    color: SECTION_COLORS.rapports.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  filterApplyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SECTION_COLORS.rapports.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterApplyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // Transactions
  transactionsSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: SECTION_COLORS.rapports.light,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionProduit: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  transactionSeparator: {
    fontSize: 12,
    color: COLORS.textLight,
    marginHorizontal: 4,
  },
  transactionListe: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  transactionStats: {
    alignItems: 'flex-end',
  },
  transactionMontant: {
    fontSize: 14,
    fontWeight: 'bold',
    color: SECTION_COLORS.rapports.primary,
  },
  transactionQuantite: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  produitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  produitItemText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  rapportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rapportIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: SECTION_COLORS.rapports.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: SECTION_COLORS.rapports.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  rapportInfo: {
    flex: 1,
  },
  rapportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  rapportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  rapportDate: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  rapportStats: {
    alignItems: 'flex-end',
  },
  rapportMontant: {
    fontSize: 18,
    fontWeight: 'bold',
    color: SECTION_COLORS.rapports.primary,
    marginBottom: 4,
  },
  rapportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SECTION_COLORS.rapports.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rapportProduits: {
    fontSize: 12,
    fontWeight: '600',
    color: SECTION_COLORS.rapports.primary,
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
