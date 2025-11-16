import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  Animated
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getDb } from '@db/init';
import { COLORS, SECTION_COLORS, ANIMATIONS } from '@constants/colors';
import { fadeIn, slideInFromBottom, fadeScaleIn } from '../../../src/utils/animations';
import { LinearGradient } from 'expo-linear-gradient';

type LigneAchat = {
  id?: number;
  libelleProduit: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
  unite?: string;
  isNew?: boolean;
  isChecked?: boolean; // Pour savoir si le produit est coché (configuré)
};

type AchatRecord = {
  id: number;
  nomListe: string;
  dateAchat: string;
  montantTotal: number;
};

type Produit = {
  id: number;
  libelle: string;
  unite: string;
};

export default function AchatDetails() {
  const params = useLocalSearchParams<{ id?: string }>();
  const achatId = Number(params.id);
  const [achat, setAchat] = useState<AchatRecord | null>(null);
  const [lignes, setLignes] = useState<LigneAchat[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour l'édition
  const [editingTitre, setEditingTitre] = useState(false);
  const [titreListe, setTitreListe] = useState('');
  const [nouveauProduit, setNouveauProduit] = useState('');
  
  // États pour le modal
  const [showModal, setShowModal] = useState(false);
  const [modalLigneIndex, setModalLigneIndex] = useState<number | null>(null);
  const [modalQuantite, setModalQuantite] = useState('');
  const [modalPrixUnitaire, setModalPrixUnitaire] = useState('');
  const [modalUnite, setModalUnite] = useState('pcs');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const modalSlideAnim = useRef(new Animated.Value(300)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(() => {
    if (!achatId || Number.isNaN(achatId)) {
      setError('Identifiant d\'achat invalide');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const db = getDb();
      
      // Charger l'achat
      const achatResult = db.getAllSync(
        `SELECT id, nomListe, dateAchat, montantTotal FROM Achat WHERE id = ?`,
        [achatId]
      ) as AchatRecord[];

      if (!achatResult.length) {
        setError('Achat introuvable');
        setLoading(false);
        return;
      }

      setAchat(achatResult[0]);
      setTitreListe(achatResult[0].nomListe);

      // Charger les lignes d'achat
      const lignesResult = db.getAllSync(
        `SELECT id, libelleProduit, quantite, prixUnitaire, prixTotal, unite
         FROM LigneAchat
         WHERE idAchat = ?
         ORDER BY id DESC`,
        [achatId]
      ) as LigneAchat[];

      // Marquer les lignes comme coché si elles ont quantité et prix > 0
      const lignesWithCheck = lignesResult.map(l => ({
        ...l,
        isChecked: l.quantite > 0 && l.prixUnitaire > 0
      }));

      setLignes(lignesWithCheck);
      
      // Charger les produits disponibles dynamiquement
      const produitsResult = db.getAllSync(
        `SELECT id, libelle, unite FROM Produit ORDER BY libelle ASC`
      ) as Produit[];
      
      setProduits(produitsResult);
      
      setError(null);
    } catch (e) {
      console.error('Erreur chargement achat:', e);
      setError('Impossible de charger les détails de cet achat');
    } finally {
      setLoading(false);
    }
  }, [achatId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Animation d'entrée au chargement
  useEffect(() => {
    if (!loading && achat) {
      fadeScaleIn(fadeAnim, scaleAnim, ANIMATIONS.duration.normal).start();
    }
  }, [loading, achat]);

  // Animation du modal
  useEffect(() => {
    if (showModal) {
      Animated.parallel([
        fadeIn(modalFadeAnim, ANIMATIONS.duration.normal),
        slideInFromBottom(modalSlideAnim, ANIMATIONS.duration.normal),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalFadeAnim, {
          toValue: 0,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
        Animated.timing(modalSlideAnim, {
          toValue: 300,
          duration: ANIMATIONS.duration.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showModal]);

  // Fonction pour sauvegarder le titre
  const handleSaveTitre = useCallback(async () => {
    if (!titreListe.trim()) {
      Alert.alert('Erreur', 'Le titre ne peut pas être vide');
      setTitreListe(achat?.nomListe || '');
      setEditingTitre(false);
      return;
    }

    try {
      const db = getDb();
      db.runSync('UPDATE Achat SET nomListe = ? WHERE id = ?', [titreListe, achatId]);
      
      if (achat) {
        setAchat({ ...achat, nomListe: titreListe });
      }
      
      setEditingTitre(false);
    } catch (error) {
      console.error('Erreur mise à jour titre:', error);
      Alert.alert('Erreur', 'Impossible de modifier le titre');
      setTitreListe(achat?.nomListe || '');
    }
  }, [titreListe, achat, achatId]);

  // Fonction pour ajouter un produit directement (sans modal)
  const handleAddProduct = useCallback(() => {
    if (!nouveauProduit.trim()) return;
    
    // Vérifier si le produit existe déjà dans la liste
    const existingIndex = lignes.findIndex(l => 
      l.libelleProduit.toLowerCase() === nouveauProduit.trim().toLowerCase()
    );
    
    if (existingIndex >= 0) {
      Alert.alert('Information', 'Ce produit est déjà dans la liste');
      setNouveauProduit('');
      return;
    }
    
    // Créer une nouvelle ligne non coché (sans quantité/prix)
    const newLigne: LigneAchat = {
      libelleProduit: nouveauProduit.trim(),
      quantite: 0,
      prixUnitaire: 0,
      prixTotal: 0,
      unite: 'pcs',
      isNew: true,
      isChecked: false
    };
    
    // Ajouter en bas de la liste (après les produits cochés)
    setLignes(prev => [...prev, newLigne]);
    setNouveauProduit('');
  }, [nouveauProduit, lignes]);

  // Fonction pour gérer le toggle de checkbox
  const handleToggleCheckbox = useCallback((index: number) => {
    const ligne = lignes[index];
    
    if (!ligne.isChecked) {
      // Si non coché, ouvrir le modal pour configurer
      setModalLigneIndex(index);
      setModalQuantite(ligne.quantite > 0 ? ligne.quantite.toString() : '1');
      setModalPrixUnitaire(ligne.prixUnitaire > 0 ? ligne.prixUnitaire.toString() : '0');
      setModalUnite(ligne.unite || 'pcs');
      setShowModal(true);
    } else {
      // Si coché, décocher (remettre à zéro)
      const newLignes = [...lignes];
      newLignes[index] = {
        ...ligne,
        quantite: 0,
        prixUnitaire: 0,
        prixTotal: 0,
        isChecked: false
      };
      setLignes(newLignes);
      
      // Sauvegarder en DB si la ligne existe
      if (ligne.id) {
    try {
      const db = getDb();
          db.runSync(
            'UPDATE LigneAchat SET quantite = 0, prixUnitaire = 0, prixTotal = 0 WHERE id = ?',
            [ligne.id]
          );
        } catch (error) {
          console.error('Erreur mise à jour:', error);
        }
      }
    }
  }, [lignes]);

  // Fonction pour valider le modal
  const handleValidateModal = useCallback(async () => {
    if (modalLigneIndex === null) return;
    
    const quantite = parseFloat(modalQuantite) || 0;
    const prixUnitaire = parseFloat(modalPrixUnitaire) || 0;
    
    if (quantite <= 0) {
      Alert.alert('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }
    
    if (prixUnitaire < 0) {
      Alert.alert('Erreur', 'Le prix unitaire ne peut pas être négatif');
      return;
    }
    
    try {
      const db = getDb();
      const prixTotal = quantite * prixUnitaire;
      const ligne = lignes[modalLigneIndex];
      
      if (ligne.id) {
        // Mettre à jour la ligne existante
        db.runSync(
          'UPDATE LigneAchat SET quantite = ?, prixUnitaire = ?, prixTotal = ?, unite = ? WHERE id = ?',
          [quantite, prixUnitaire, prixTotal, modalUnite, ligne.id]
        );
      } else {
        // Créer une nouvelle ligne en DB
        const result = db.runSync(
          'INSERT INTO LigneAchat (idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, ?, ?, ?, ?)',
          [achatId, ligne.libelleProduit, quantite, prixUnitaire, prixTotal, modalUnite]
        );
        
        ligne.id = result.lastInsertRowId as number;
      }
      
      // Mettre à jour l'état
      const newLignes = [...lignes];
      newLignes[modalLigneIndex] = {
        ...ligne,
        quantite,
        prixUnitaire,
        prixTotal,
        unite: modalUnite,
        isChecked: true,
        isNew: false
      };
      setLignes(newLignes);
      
      // Fermer le modal
      setShowModal(false);
      setModalLigneIndex(null);
      setModalQuantite('');
      setModalPrixUnitaire('');
      setModalUnite('pcs');
      
    } catch (error) {
      console.error('Erreur sauvegarde ligne:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le produit');
    }
  }, [modalLigneIndex, modalQuantite, modalPrixUnitaire, modalUnite, lignes, achatId]);

  // Fonction pour supprimer une ligne
  const handleDeleteLigne = useCallback((index: number) => {
    const ligne = lignes[index];
    
    Alert.alert(
      'Confirmation',
      `Supprimer "${ligne.libelleProduit}" de la liste ?`,
      [
        { text: 'Annuler' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (ligne.id) {
                const db = getDb();
                db.runSync('DELETE FROM LigneAchat WHERE id = ?', [ligne.id]);
              }
              
              setLignes(prev => prev.filter((_, i) => i !== index));
            } catch (error) {
              console.error('Erreur suppression ligne:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            }
          }
        }
      ]
    );
  }, [lignes]);

  // Fonction pour modifier une ligne dans le tableau
  const handleEditLigne = useCallback((index: number) => {
    const ligne = lignes[index];
    setModalLigneIndex(index);
    setModalQuantite(ligne.quantite.toString());
    setModalPrixUnitaire(ligne.prixUnitaire.toString());
    setModalUnite(ligne.unite || 'pcs');
    setShowModal(true);
  }, [lignes]);

  // Fonction pour mettre à jour un champ dans le tableau
  const updateLigneField = useCallback((index: number, field: 'libelleProduit' | 'quantite' | 'prixUnitaire', value: string | number) => {
    const newLignes = [...lignes];
    const ligne = newLignes[index];
    
    if (field === 'libelleProduit') {
      ligne.libelleProduit = (value as string).trim();
    } else if (field === 'quantite') {
      const numValue = parseFloat(value as string) || 0;
      ligne.quantite = numValue;
    } else if (field === 'prixUnitaire') {
      const numValue = parseFloat(value as string) || 0;
      ligne.prixUnitaire = numValue;
    }
    
    // Recalculer le prix total
    ligne.prixTotal = ligne.quantite * ligne.prixUnitaire;
    ligne.isChecked = ligne.quantite > 0 && ligne.prixUnitaire > 0;
    
    setLignes(newLignes);
    
    // Sauvegarder en DB si la ligne existe (avec debounce implicite via le rendu)
    const ligneId = ligne.id;
    if (ligneId) {
      // Utiliser un timeout pour éviter trop de sauvegardes
      setTimeout(() => {
        try {
          const db = getDb();
          db.runSync(
            'UPDATE LigneAchat SET libelleProduit = ?, quantite = ?, prixUnitaire = ?, prixTotal = ? WHERE id = ?',
            [ligne.libelleProduit, ligne.quantite, ligne.prixUnitaire, ligne.prixTotal, ligneId]
          );
        } catch (error) {
          console.error('Erreur mise à jour:', error);
        }
      }, 500);
    }
  }, [lignes]);

  const totalDepense = useMemo(
    () => lignes.filter(l => l.isChecked).reduce((sum, ligne) => sum + ligne.prixTotal, 0),
    [lignes]
  );

  if (!achatId || Number.isNaN(achatId)) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="warning" size={48} color={COLORS.error} />
        <Text style={styles.errorTitle}>Achat introuvable</Text>
        <Text style={styles.errorText}>Identifiant fourni invalide.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={SECTION_COLORS.achats.primary} />
        <Text style={styles.loadingText}>Chargement des détails...</Text>
      </View>
    );
  }

  if (error || !achat) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="warning" size={48} color={COLORS.error} />
        <Text style={styles.errorTitle}>Oups...</Text>
        <Text style={styles.errorText}>{error || 'Impossible de charger cet achat'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lignesChecked = lignes.filter(l => l.isChecked);
  const lignesUnchecked = lignes.filter(l => !l.isChecked);

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
      <LinearGradient
        colors={SECTION_COLORS.achats.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {editingTitre ? (
            <View style={styles.titleEditContainer}>
              <TextInput
                style={styles.titleInput}
                value={titreListe}
                onChangeText={setTitreListe}
                placeholder="Nom de la liste"
                autoFocus
                onBlur={handleSaveTitre}
                onSubmitEditing={handleSaveTitre}
              />
              <TouchableOpacity onPress={handleSaveTitre}>
                <Ionicons name="checkmark" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditingTitre(true)}>
              <Text style={styles.headerTitle}>{titreListe}</Text>
              <Text style={styles.headerSubtitle}>
                {format(new Date(achat.dateAchat), 'EEEE dd MMMM yyyy', { locale: fr })}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={() => router.push('/rapports')}
        >
          <Ionicons name="bar-chart" size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Zone d'ajout de produit */}
      <View style={styles.addProductContainer}>
        <TextInput
          style={styles.productInput}
          value={nouveauProduit}
          onChangeText={setNouveauProduit}
          placeholder="Élément de liste"
          onSubmitEditing={handleAddProduct}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddProduct}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Tableau des produits cochés */}
        {lignesChecked.length > 0 && (
          <>
        <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Détail des achats</Text>
        </View>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Désignation et quantité</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>PU</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>PT</Text>
                <View style={{ width: 60 }} />
          </View>

              {lignesChecked.map((ligne, index) => {
                const realIndex = lignes.findIndex(l => l === ligne);
                const isEven = index % 2 === 0;
                return (
                  <View 
                    key={ligne.id || realIndex} 
                    style={[
                      styles.tableRow,
                      isEven && styles.tableRowEven
                    ]}
                  >
                    <View style={[styles.tableCell, { flex: 2 }]}>
                      <View style={styles.tableCellProductContainer}>
                        <TextInput
                          style={[styles.tableCellInput, styles.tableCellProductName]}
                          value={ligne.libelleProduit}
                          onChangeText={(text) => updateLigneField(realIndex, 'libelleProduit', text)}
                          placeholder="Produit"
                        />
                        <View style={styles.tableCellQuantityContainer}>
                          <TextInput
                            style={[styles.tableCellInput, styles.tableCellQuantity]}
                            value={ligne.quantite > 0 ? ligne.quantite.toString() : ''}
                            onChangeText={(text) => updateLigneField(realIndex, 'quantite', text)}
                            keyboardType="numeric"
                            placeholder="0"
                          />
                          <View style={styles.tableCellUnitBadge}>
                            <Text style={styles.tableCellUnit}>{ligne.unite || 'pcs'}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <TextInput
                        style={styles.tableCellInput}
                        value={ligne.prixUnitaire > 0 ? ligne.prixUnitaire.toString() : ''}
                        onChangeText={(text) => updateLigneField(realIndex, 'prixUnitaire', text)}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <View style={styles.tableCellTotalContainer}>
                        <Text style={styles.tableCellTextBold}>{ligne.prixTotal.toLocaleString()}</Text>
                        <Text style={styles.tableCellCurrency}>Ar</Text>
                      </View>
                    </View>
                    <View style={styles.tableCellActions}>
                      <TouchableOpacity
                        onPress={() => handleEditLigne(realIndex)}
                        style={[styles.actionButton, styles.actionButtonEdit]}
                      >
                        <Ionicons name="pencil" size={16} color={SECTION_COLORS.achats.primary} />
              </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteLigne(realIndex)}
                        style={[styles.actionButton, styles.actionButtonDelete]}
                      >
                        <Ionicons name="trash" size={16} color={COLORS.error} />
                      </TouchableOpacity>
              </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Liste des articles non cochés - Positionnée en bas après le tableau */}
        {lignesUnchecked.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Liste des articles</Text>
            </View>

            {lignesUnchecked.map((ligne, index) => {
              const realIndex = lignes.findIndex(l => l === ligne);
              return (
                <View key={realIndex} style={styles.produitItem}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => handleToggleCheckbox(realIndex)}
                  >
                    <View style={[styles.checkbox, ligne.isChecked && styles.checkboxChecked]}>
                      {ligne.isChecked && <Ionicons name="checkmark" size={16} color="white" />}
                    </View>
                  </TouchableOpacity>
                  <Text style={styles.produitName}>{ligne.libelleProduit}</Text>
                </View>
              );
            })}
          </>
        )}

        {/* Carte de résumé avec gradient - Positionnée en bas */}
        {lignesChecked.length > 0 && (
          <LinearGradient
            colors={SECTION_COLORS.achats.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryCardGradient}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>{totalDepense.toLocaleString()} Ar</Text>
              </View>
              <View style={styles.summaryBadge}>
                <Ionicons name="list" size={20} color="white" />
                <Text style={styles.summaryBadgeText}>{lignesChecked.length} articles</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Bouton consulter rapport */}
        {lignesChecked.length > 0 && (
                <TouchableOpacity
            style={styles.reportButton}
            onPress={() => router.push('/rapports')}
          >
            <Ionicons name="bar-chart" size={20} color="white" />
            <Text style={styles.reportButtonText}>Consulter le rapport</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal pour ajouter/modifier quantité et prix */}
      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowModal(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity: modalFadeAnim }
          ]}
        >
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: modalSlideAnim }],
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalLigneIndex !== null && lignes[modalLigneIndex]
                  ? `Ajouter quantité et prix unitaire du ${lignes[modalLigneIndex].libelleProduit.toLowerCase()}`
                  : 'Ajouter quantité et prix unitaire'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Entrez prix unitaire</Text>
                    <TextInput
                  style={styles.modalInput}
                  value={modalPrixUnitaire}
                  onChangeText={setModalPrixUnitaire}
                      keyboardType="numeric"
                  placeholder="0"
                    />
                  </View>
                  
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Entrez quantité</Text>
                    <TextInput
                  style={styles.modalInput}
                  value={modalQuantite}
                  onChangeText={setModalQuantite}
                      keyboardType="numeric"
                  placeholder="1"
                    />
                    <TextInput
                  style={[styles.modalInput, styles.modalUniteInput]}
                  value={modalUnite}
                  onChangeText={setModalUnite}
                  placeholder="Unité (kg, L, pcs...)"
                    />
                  </View>
                </View>
                
            <View style={styles.modalActions}>
                <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalValidateButton}
                onPress={handleValidateModal}
              >
                <Text style={styles.modalValidateText}>Valider</Text>
                </TouchableOpacity>
              </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  titleEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'white',
    marginRight: 8,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontSize: 12,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addProductContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  productInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: SECTION_COLORS.achats.primary,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  summaryCardGradient: {
    borderRadius: 20,
    padding: 24,
    marginTop: 24,
    marginBottom: 16,
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  summaryBadgeText: {
    fontWeight: '700',
    color: 'white',
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  produitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: SECTION_COLORS.achats.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: SECTION_COLORS.achats.light,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: SECTION_COLORS.achats.primary,
    borderColor: SECTION_COLORS.achats.primary,
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  produitName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: SECTION_COLORS.achats.light,
    marginBottom: 12,
    backgroundColor: SECTION_COLORS.achats.light,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: -4,
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: SECTION_COLORS.achats.primary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  tableRowEven: {
    backgroundColor: SECTION_COLORS.achats.light,
    borderLeftColor: SECTION_COLORS.achats.primary,
  },
  tableCell: {
    paddingRight: 8,
  },
  tableCellInput: {
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1.5,
    borderColor: SECTION_COLORS.achats.light,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    minHeight: 36,
    fontWeight: '500',
  },
  tableCellProductContainer: {
    gap: 4,
  },
  tableCellProductName: {
    marginBottom: 4,
  },
  tableCellQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tableCellQuantity: {
    flex: 1,
    minWidth: 60,
  },
  tableCellUnitBadge: {
    backgroundColor: SECTION_COLORS.achats.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: SECTION_COLORS.achats.primary,
  },
  tableCellUnit: {
    fontSize: 11,
    color: SECTION_COLORS.achats.primary,
    fontWeight: '600',
  },
  tableCellTotalContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  tableCellTextBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SECTION_COLORS.achats.primary,
    letterSpacing: 0.2,
  },
  tableCellCurrency: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  tableCellActions: {
    flexDirection: 'row',
    gap: 6,
    width: 60,
  },
  actionButton: {
    padding: 6,
    borderRadius: 8,
  },
  actionButtonEdit: {
    backgroundColor: SECTION_COLORS.achats.light,
  },
  actionButtonDelete: {
    backgroundColor: '#FEE2E2',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SECTION_COLORS.rapports.primary,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 8,
    shadowColor: SECTION_COLORS.rapports.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  reportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  modalBody: {
    padding: 20,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.surface,
  },
  modalUniteInput: {
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalValidateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SECTION_COLORS.achats.primary,
    alignItems: 'center',
  },
  modalValidateText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textLight,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.error,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: SECTION_COLORS.achats.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
