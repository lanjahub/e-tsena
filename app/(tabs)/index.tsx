import { router } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { getDb, checkDatabase } from '@db/init';
import { COLORS, SECTION_COLORS } from '@constants/colors';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

// Interface pour les achats
interface Achat {
  id: number;
  nomListe: string;
  dateAchat: string;
  totalDepense: number;
  nombreArticles: number;
}

// Composant principal - Page d'accueil avec liste des achats
export default function Home() {
  const [achats, setAchats] = useState<Achat[]>([]);
  const [filteredAchats, setFilteredAchats] = useState<Achat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour charger tous les achats
  const loadAchats = useCallback(() => {
    try {
      const dbOk = checkDatabase();
      if (!dbOk) throw new Error('Base de données non disponible');

      const database = getDb();
      
      // Récupérer tous les achats avec leurs détails
      const achatsResult = database.getAllSync(`
        SELECT 
          a.id,
          a.nomListe,
          a.dateAchat,
          COALESCE(SUM(l.prixTotal), 0) as totalDepense,
          COUNT(l.id) as nombreArticles
        FROM Achat a
        LEFT JOIN LigneAchat l ON a.id = l.idAchat
        GROUP BY a.id, a.nomListe, a.dateAchat
        ORDER BY a.dateAchat DESC
      `);

      const achatsData = achatsResult as Achat[];
      setAchats(achatsData);
      setFilteredAchats(achatsData);
      setLoading(false);
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, []);

  // Fonction de recherche
  const handleSearch = useCallback((text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredAchats(achats);
    } else {
      const filtered = achats.filter(achat =>
        achat.nomListe.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredAchats(filtered);
    }
  }, [achats]);

  // Fonction pour créer un nouvel achat - Crée directement en DB et redirige
  const createNewAchat = () => {
    try {
      const database = getDb();
      const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
      
      // Créer un nouvel achat avec le nom par défaut
      database.runSync(
        `INSERT INTO Achat (nomListe, dateAchat) VALUES (?, ?)`,
        ['Nouvelle liste', today]
      );
      
      // Récupérer le dernier ID inséré
      const queryResult = database.getAllSync(
        'SELECT id FROM Achat ORDER BY id DESC LIMIT 1'
      );
      
      if (queryResult.length > 0) {
        // TypeScript: Aucun cast nécessaire, accès direct
        const achatId = (queryResult[0] as any).id;
        // Rediriger directement à la page d'édition
        router.push(`/achat/${achatId}`);
      } else {
        throw new Error('Impossible de créer l\'achat');
      }
    } catch (error) {
      console.error('Erreur création achat:', error);
      Alert.alert('Erreur', 'Impossible de créer la liste d\'achat');
    }
  };

  // Charge les données au montage
  useEffect(() => {
    loadAchats();
  }, [loadAchats]);

  // Mettre à jour la recherche quand les achats changent
  useEffect(() => {
    handleSearch(searchQuery);
  }, [achats, searchQuery, handleSearch]);





  if (loading) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={loadAchats} />;

  return (
    <View style={styles.container}>
      {/* En-tête avec titre et actions - Gradient rose-violet */}
      <LinearGradient
        colors={['#EC4899', '#A855F7', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="cart" size={28} color="white" />
            </View>
            <View>
              <Text style={styles.headerTitle}>E-tsena</Text>
              <Text style={styles.headerSubtitle}>Mes listes d'achats</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.addButton} onPress={createNewAchat}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Statistiques rapides en haut - Version compacte avec 3 cartes */}
      <View style={styles.topStatsContainer}>
        <Text style={styles.topStatsTitle}>📊 Aperçu</Text>
        <View style={styles.topStatsGrid}>
          <View style={styles.topStatCard}>
            <Ionicons name="wallet-outline" size={16} color="#EC4899" />
            <Text style={styles.topStatLabel}>Dépenses</Text>
            <Text style={styles.topStatValue}>
              {(() => {
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const total = achats.filter(achat => {
                  const achatDate = new Date(achat.dateAchat);
                  return achatDate.getMonth() === currentMonth && achatDate.getFullYear() === currentYear;
                }).reduce((sum, achat) => sum + achat.totalDepense, 0);
                return total > 1000 ? `${(total / 1000).toFixed(1)}k` : total.toString();
              })()}
            </Text>
          </View>
          
          <View style={styles.topStatCard}>
            <Ionicons name="cart-outline" size={16} color="#F59E0B" />
            <Text style={styles.topStatLabel}>Articles</Text>
            <Text style={styles.topStatValue}>
              {(() => {
                const currentMonth = new Date().getMonth();
                const monthlyAchats = achats.filter(achat => {
                  const achatDate = new Date(achat.dateAchat);
                  return achatDate.getMonth() === currentMonth;
                });
                return monthlyAchats.reduce((sum, achat) => sum + achat.nombreArticles, 0);
              })()}
            </Text>
          </View>
          
          <View style={styles.topStatCard}>
            <Ionicons name="calendar-outline" size={16} color="#A855F7" />
            <Text style={styles.topStatLabel}>Listes</Text>
            <Text style={styles.topStatValue}>
              {(() => {
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                return achats.filter(achat => {
                  const achatDate = new Date(achat.dateAchat);
                  return achatDate.getMonth() === currentMonth && achatDate.getFullYear() === currentYear;
                }).length;
              })()}
            </Text>
          </View>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une liste d'achat..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Grille des achats - MAINTENANT EN PREMIER */}
      <View style={styles.achatsSection}>
        <View style={styles.achatsSectionHeader}>
          <Text style={styles.achatsSectionTitle}>Mes achats ({filteredAchats.length})</Text>
          <TouchableOpacity onPress={loadAchats} style={styles.refreshButton}>
            <Ionicons name="refresh" size={20} color="#A855F7" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredAchats}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <AchatCard achat={item} />}
          numColumns={2}
          columnWrapperStyle={styles.achatsRow}
          contentContainerStyle={styles.achatsGrid}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyAchatsView searchQuery={searchQuery} />}
          key="achats-grid"
        />
      </View>

      {/* Astuce du jour */}
      {/*<View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Ionicons name={tipOfTheDay.icon as any} size={18} color={COLORS.warning} />
          <Text style={styles.tipTitle}>{tipOfTheDay.title}</Text>
        </View>
        <Text style={styles.tipText}>
          {tipOfTheDay.text}
        </Text>
      </View>*/}

      {/* Barre de navigation inférieure */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity 
          style={[styles.navItem, styles.navItemActive]}
          onPress={() => {/* Déjà sur l'accueil */}}
        >
          <Ionicons name="home" size={24} color="#A855F7" />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Accueil</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/produits')}
        >
          <Ionicons name="cube" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Produits</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/rapports')}
        >
          <Ionicons name="analytics" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Rapports</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => router.push('/statistiques')}
        >
          <Ionicons name="stats-chart" size={24} color={COLORS.textLight} />
          <Text style={styles.navLabel}>Stats</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={createNewAchat}
        >
          <View style={styles.addNavButton}>
            <Ionicons name="add" size={24} color="white" />
          </View>
          <Text style={styles.navLabel}>Créer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==================== COMPOSANTS RÉUTILISABLES ====================

const LoadingView = () => (
  <View style={[styles.container, styles.center]}>
    <Ionicons name="basket" size={60} color={COLORS.primary} />
    <Text style={styles.loadingText}>Chargement des achats...</Text>
  </View>
);

const ErrorView = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <View style={[styles.container, styles.center]}>
    <Ionicons name="warning" size={60} color="#F44336" />
    <Text style={styles.errorTitle}>Erreur</Text>
    <Text style={styles.errorText}>{error}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
      <Text style={styles.retryText}>Réessayer</Text>
    </TouchableOpacity>
  </View>
);

// Composant pour chaque carte d'achat - Version moderne style Google Keep
const AchatCard = ({ achat }: { achat: Achat }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const handleDelete = () => {
    Alert.alert(
      'Supprimer la liste',
      `Voulez-vous vraiment supprimer "${achat.nomListe}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            try {
              const db = getDb();
              db.runSync('DELETE FROM LigneAchat WHERE idAchat = ?', [achat.id]);
              db.runSync('DELETE FROM Achat WHERE id = ?', [achat.id]);
              // Recharger la liste
              router.replace('/');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la liste');
            }
          }
        }
      ]
    );
  };
  
  const handleDuplicate = () => {
    try {
      const db = getDb();
      const newNom = `${achat.nomListe} (Copie)`;
      const now = new Date().toISOString();
      
      db.runSync(
        'INSERT INTO Achat (nomListe, dateAchat, montantTotal) VALUES (?, ?, ?)',
        [newNom, now, achat.totalDepense]
      );
      
      const result = db.getFirstSync<{ id: number }>('SELECT last_insert_rowid() as id');
      const newAchatId = result?.id;
      
      if (newAchatId) {
        // Copier les lignes d'achat
        const lignes = db.getAllSync(
          'SELECT * FROM LigneAchat WHERE idAchat = ?',
          [achat.id]
        ) as any[];
        
        for (const ligne of lignes) {
          db.runSync(
            'INSERT INTO LigneAchat (idAchat, idProduit, quantite, prixUnitaire, prixTotal) VALUES (?, ?, ?, ?, ?)',
            [newAchatId, ligne.idProduit, ligne.quantite, ligne.prixUnitaire, ligne.prixTotal]
          );
        }
        
        Alert.alert('Succès', 'Liste copiée !');
        router.replace('/');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de copier la liste');
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.achatCardSquare}
      onPress={() => router.push(`/achat/${achat.id}`)}
      activeOpacity={0.7}
    >
      {/* En-tête avec icône et menu 3 points */}
      <View style={styles.achatSquareHeader}>
        <View style={styles.achatSquareIcon}>
          <Ionicons name="receipt" size={20} color={SECTION_COLORS.achats.primary} />
        </View>
        
        {/* Menu 3 points (style Google Keep) */}
        <TouchableOpacity 
          style={styles.achatMenuButton}
          onPress={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
        
        {/* Menu déroulant */}
        {showMenu && (
          <View style={styles.achatMenu}>
            <TouchableOpacity 
              style={styles.achatMenuItem}
              onPress={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                handleDuplicate();
              }}
            >
              <Ionicons name="copy-outline" size={16} color={COLORS.text} />
              <Text style={styles.achatMenuItemText}>Créer une copie</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.achatMenuItem}
              onPress={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                handleDelete();
              }}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
              <Text style={[styles.achatMenuItemText, {color: COLORS.error}]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Contenu principal */}
      <View style={styles.achatSquareContent}>
        <Text style={styles.achatSquareName} numberOfLines={2}>
          {achat.nomListe}
        </Text>
        
        {/* Méta-informations */}
        <View style={styles.achatSquareMeta}>
          <View style={styles.achatSquareMetaItem}>
            <Ionicons name="basket-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.achatSquareMetaText}>
              {achat.nombreArticles} article{achat.nombreArticles > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Pied avec prix */}
      <View style={styles.achatSquareFooter}>
        <Text style={styles.achatSquarePrice}>
          {achat.totalDepense.toLocaleString()} Ar
        </Text>
        <View style={styles.achatSquareProgress}>
          <View 
            style={[styles.achatSquareProgressBar, { 
              width: `${Math.min((achat.totalDepense / 50000) * 100, 100)}%` 
            }]} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Vue vide quand il n'y a pas d'achats
const EmptyAchatsView = ({ searchQuery }: { searchQuery: string }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <Ionicons 
        name={searchQuery ? "search-outline" : "basket-outline"} 
        size={48} 
        color="#ddd" 
      />
    </View>
    <Text style={styles.emptyTitle}>
      {searchQuery ? 'Aucun résultat' : 'Aucun achat'}
    </Text>
    <Text style={styles.emptyText}>
      {searchQuery 
        ? `Aucune liste ne correspond à "${searchQuery}"`
        : 'Commencez par créer votre première liste d\'achat'
      }
    </Text>
    {!searchQuery && (
      <TouchableOpacity 
        style={styles.emptyButton} 
        onPress={() => router.push('/nouvel-achat')}
      >
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.emptyButtonText}>Créer ma première liste</Text>
      </TouchableOpacity>
    )}
  </View>
);



// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  // Header modernisé avec gradient rose-violet
  header: {
    paddingTop: 50,
    paddingBottom: 18,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Barre de recherche moderne
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: -8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  
  // Dashboard
  dashboardContainer: {
    flex: 1,
  },
  
  // Statistiques en haut - Version compacte avec 3 cartes
  topStatsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  topStatsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: 0.3,
    opacity: 0.8,
  },
  topStatsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  topStatCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  topStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 4,
  },
  topStatValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  
  // Statistiques rapides - Version ultra-compacte et moderne
  quickStatsContainer: {
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },
  quickStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    opacity: 0.8,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginVertical: 3,
  },
  quickStatLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.7,
  },
  
  // Boutons principaux améliorés
  mainButtons: {
    flexDirection: 'column',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mainButtonContent: {
    flex: 1,
  },
  mainButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  mainButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Liste des achats
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF', // Violet clair du design
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  
  // Cartes d'achat
  achatCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  achatCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  achatDateContainer: {
    marginRight: 12,
  },
  achatDateBadge: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: SECTION_COLORS.home.light,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: SECTION_COLORS.home.primary,
  },
  achatDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SECTION_COLORS.home.primary,
    lineHeight: 18,
  },
  achatMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: SECTION_COLORS.home.text,
    textTransform: 'uppercase',
    lineHeight: 12,
  },
  achatCardInfo: {
    flex: 1,
  },
  achatNom: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  achatDate: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  achatMeta: {
    flexDirection: 'row',
  },
  achatMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  achatMetaText: {
    fontSize: 12,
    color: SECTION_COLORS.home.primary,
    fontWeight: '600',
  },
  achatCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  achatTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: SECTION_COLORS.home.primary,
  },
  achatCardFooter: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  achatProgress: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  achatProgressBar: {
    height: '100%',
    backgroundColor: SECTION_COLORS.home.primary,
    borderRadius: 2,
  },
  
  // État vide
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A855F7', // Violet du design
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Astuce du jour
  tipCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  
  // États de chargement et erreur
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Nouveaux styles pour la navbar et les achats
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Section des achats - Design moderne et aéré avec plus d'espace
  achatsSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  achatsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  achatsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  achatsGrid: {
    paddingBottom: 120, // Espace pour la barre de navigation et l'astuce
  },
  achatsRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  
  // Cartes d'achat carrées - Design moderne et minimaliste
  achatCardSquare: {
    width: '48%',
    aspectRatio: 1,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  achatSquareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    position: 'relative',
  },
  achatSquareIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SECTION_COLORS.achats.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Menu 3 points style Google Keep
  achatMenuButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achatMenu: {
    position: 'absolute',
    right: 0,
    top: 32,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  achatMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  achatMenuItemText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  achatSquareDateBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  achatSquareDate: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textLight,
    letterSpacing: 0.2,
  },
  achatSquareContent: {
    flex: 1,
    justifyContent: 'center',
  },
  achatSquareName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 19,
    marginBottom: 6,
  },
  achatSquareMeta: {
    marginBottom: 6,
  },
  achatSquareMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  achatSquareMetaText: {
    fontSize: 10,
    color: COLORS.textLight,
    opacity: 0.8,
  },
  achatSquareFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: 10,
  },
  achatSquarePrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: SECTION_COLORS.achats.primary,
    marginBottom: 5,
  },
  achatSquareProgress: {
    height: 3,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  achatSquareProgressBar: {
    height: '100%',
    backgroundColor: SECTION_COLORS.achats.primary,
    borderRadius: 1.5,
  },
  
  // Barre de navigation inférieure
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    backgroundColor: '#F3E8FF', // Violet clair du design
    borderRadius: 12,
    paddingVertical: 12,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textLight,
    marginTop: 4,
  },
  navLabelActive: {
    color: '#A855F7', // Violet du design
    fontWeight: 'bold',
  },
  addNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#A855F7', // Violet du design
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});