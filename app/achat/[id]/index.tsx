import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Alert,
  TextInput,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getDb } from '@db/init';
import { COLORS, SECTION_COLORS } from '@constants/colors';
import { format } from 'date-fns';

// Interfaces
interface Achat {
  id: number;
  nomListe: string;
  dateAchat: string;
}

interface LigneAchat {
  id: number;
  idProduit: number;
  libelleProduit: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
}

interface Produit {
  id: number;
  libelle: string;
}

export default function GestionAchat() {
  const { id } = useLocalSearchParams();
  const achatId = Number.parseInt(id as string);

  const [achat, setAchat] = useState<Achat | null>(null);
  const [lignesAchat, setLignesAchat] = useState<LigneAchat[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLigne, setSelectedLigne] = useState<LigneAchat | null>(null);
  
  // États pour l'ajout simplifié de produits (juste le nom d'abord)
  const [newProduitName, setNewProduitName] = useState('');
  const [produitsAjoutesTemp, setProduitsAjoutesTemp] = useState<{id: number, libelle: string}[]>([]);
  const [selectedForDetails, setSelectedForDetails] = useState<{[key: number]: boolean}>({});
  const [produitsDetails, setProduitsDetails] = useState<{[key: number]: {quantite: string, prix: string}}>({});
  const [searchProduit, setSearchProduit] = useState('');
  
  // États pour la gestion CRUD des produits
  const [showManageProduitsModal, setShowManageProduitsModal] = useState(false);
  const [showAddProduitModal, setShowAddProduitModal] = useState(false);
  const [showEditProduitModal, setShowEditProduitModal] = useState(false);
  const [selectedProduit, setSelectedProduit] = useState<Produit | null>(null);
  const [produitLibelle, setProduitLibelle] = useState('');
  const [searchGestionProduit, setSearchGestionProduit] = useState('');
  
  // États pour la gestion du nom de liste
  const [showEditListNameModal, setShowEditListNameModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  // État pour le menu d'actions (style Google Keep)
  const [showHeaderMenuModal, setShowHeaderMenuModal] = useState(false);

  // Charger les données
  const loadData = useCallback(() => {
    try {
      const db = getDb();
      
      // Charger les informations de l'achat
      const achatResult = db.getAllSync(
        'SELECT * FROM Achat WHERE id = ?',
        [achatId]
      );
      
      if (achatResult.length === 0) {
        Alert.alert('Erreur', 'Achat introuvable');
        router.back();
        return;
      }
      
      setAchat(achatResult[0] as Achat);

      // Charger les lignes d'achat
      const lignesResult = db.getAllSync(`
        SELECT 
          la.*,
          p.libelle as libelleProduit
        FROM LigneAchat la
        JOIN Produit p ON p.id = la.idProduit
        WHERE la.idAchat = ?
        ORDER BY la.id DESC
      `, [achatId]);
      
      setLignesAchat(lignesResult as LigneAchat[]);

      // Charger tous les produits
      const produitsResult = db.getAllSync('SELECT * FROM Produit ORDER BY libelle');
      setProduits(produitsResult as Produit[]);
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
      setLoading(false);
    }
  }, [achatId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculer le total
  const totalGeneral = lignesAchat.reduce((sum, ligne) => sum + ligne.prixTotal, 0);

  // === NOUVEAU SYSTÈME D'AJOUT SIMPLIFIÉ ===
  
  // Ajouter un produit à la liste temporaire (juste le nom)
  const handleQuickAddProduit = (produit: Produit) => {
    // Vérifier si déjà ajouté
    if (produitsAjoutesTemp.some(p => p.id === produit.id)) {
      Alert.alert('Info', 'Ce produit est déjà dans la liste');
      return;
    }
    
    // Ajouter à la liste temporaire
    setProduitsAjoutesTemp(prev => [...prev, { id: produit.id, libelle: produit.libelle }]);
  };
  
  // Créer un nouveau produit rapidement et l'ajouter
  const handleCreateAndAddProduit = useCallback(() => {
    if (!newProduitName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de produit');
      return;
    }

    try {
      const db = getDb();

      // Vérifier si le produit existe déjà
      const existing = db.getFirstSync<Produit>(
        'SELECT * FROM Produit WHERE LOWER(libelle) = LOWER(?)',
        [newProduitName.trim()]
      );

      if (existing) {
        Alert.alert('Info', 'Ce produit existe déjà');
        handleQuickAddProduit(existing);
        setNewProduitName('');
        return;
      }

      // Créer le nouveau produit
      const result = db.runSync(
        'INSERT INTO Produit (libelle) VALUES (?)',
        [newProduitName.trim()]
      );

      const newProduit = {
        // Convertir proprement lastInsertRowId en number
        id: Number(result.lastInsertRowId),
        libelle: newProduitName.trim()
      };

      // L'ajouter immédiatement à la liste temporaire
      setProduitsAjoutesTemp(prev => [...prev, newProduit]);
      setNewProduitName('');

      // Recharger la liste des produits
      loadData();
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      Alert.alert('Erreur', 'Impossible de créer le produit');
    }
  }, [newProduitName, handleQuickAddProduit, loadData]);

  // Retirer un produit de la liste temporaire
  const handleRemoveTempProduit = (produitId: number) => {
    setProduitsAjoutesTemp(prev => prev.filter(p => p.id !== produitId));
    // Retirer aussi la checkbox et les détails
    setSelectedForDetails(prev => {
      const newState = {...prev};
      delete newState[produitId];
      return newState;
    });
    setProduitsDetails(prev => {
      const newState = {...prev};
      delete newState[produitId];
      return newState;
    });
  };
  
  // Toggle checkbox pour remplir les détails
  const toggleProduitDetails = (produitId: number) => {
    setSelectedForDetails(prev => ({
      ...prev,
      [produitId]: !prev[produitId]
    }));
    
    // Si on coche, initialiser les détails
    if (!selectedForDetails[produitId]) {
      setProduitsDetails(prev => ({
        ...prev,
        [produitId]: { quantite: '1', prix: '' }
      }));
    }
  };
  
  // Enregistrer les produits (ceux cochés avec détails + ceux non cochés avec valeurs par défaut)
  const handleSaveAllTempProduits = () => {
    if (produitsAjoutesTemp.length === 0) {
      Alert.alert('Info', 'Aucun produit à ajouter');
      return;
    }
    
    try {
      const db = getDb();
      
      for (const produit of produitsAjoutesTemp) {
        // Si coché, utiliser les détails renseignés
        if (selectedForDetails[produit.id] && produitsDetails[produit.id]) {
          const details = produitsDetails[produit.id];
          const qty = details.quantite ? Number.parseFloat(details.quantite) : 1;
          const prix = details.prix ? Number.parseFloat(details.prix) : 0;
          const total = qty * prix;
          
          db.runSync(
            'INSERT INTO LigneAchat (idAchat, idProduit, quantite, prixUnitaire, prixTotal) VALUES (?, ?, ?, ?, ?)',
            [achatId, produit.id, qty, prix, total]
          );
        } else {
          // Sinon, ajouter avec valeurs par défaut (qté=1, prix=0)
          db.runSync(
            'INSERT INTO LigneAchat (idAchat, idProduit, quantite, prixUnitaire, prixTotal) VALUES (?, ?, ?, ?, ?)',
            [achatId, produit.id, 1, 0, 0]
          );
        }
      }
      
      // Réinitialiser
      setProduitsAjoutesTemp([]);
      setSelectedForDetails({});
      setProduitsDetails({});
      setShowAddModal(false);
      setNewProduitName('');
      setSearchProduit('');
      loadData();
      
      Alert.alert('Succès', `${produitsAjoutesTemp.length} produit(s) ajouté(s) !`);
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter les produits');
    }
  };
  
  // Mettre à jour les détails d'un produit
  const updateProduitDetail = (produitId: number, field: 'quantite' | 'prix', value: string) => {
    setProduitsDetails(prev => ({
      ...prev,
      [produitId]: {
        ...prev[produitId],
        [field]: value
      }
    }));
  };

  // Toggle checkbox pour sélectionner/désélectionner un produit
  const toggleProduitSelection = (produitId: number) => {
    // basculer simplement l'état de selectedForDetails pour afficher ou masquer les détails
    setSelectedForDetails(prev => ({ ...prev, [produitId]: !prev[produitId] }));
  };

  // Modifier un produit existant
  const handleEditProduit = () => {
    if (!selectedLigne) {
      Alert.alert('Erreur', 'Erreur de sélection');
      return;
    }

    const qty = selectedLigne.quantite;
    const prix = selectedLigne.prixUnitaire;

    try {
      const db = getDb();
      const total = qty * prix;

      db.runSync(`
        UPDATE LigneAchat 
        SET quantite = ?, prixUnitaire = ?, prixTotal = ?
        WHERE id = ?
      `, [qty, prix, total, selectedLigne.id]);

      setSelectedLigne(null);
      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      Alert.alert('Erreur', 'Impossible de modifier le produit');
    }
  };

  // Supprimer un produit
  const handleDeleteProduit = (ligne: LigneAchat) => {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer ${ligne.libelleProduit} de la liste ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            try {
              const db = getDb();
              db.runSync('DELETE FROM LigneAchat WHERE id = ?', [ligne.id]);
              loadData();
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            }
          }
        }
      ]
    );
  };

  // Valider et enregistrer la liste
  const handleValidateList = () => {
    if (lignesAchat.length === 0) {
      Alert.alert('Attention', 'Ajoutez au moins un produit avant de valider');
      return;
    }

    Alert.alert(
      'Valider la liste',
      'Votre liste d\'achat sera enregistrée avec tous les produits ajoutés.',
      [
        { text: 'Continuer l\'édition', style: 'cancel' },
        {
          text: 'Valider',
          onPress: () => {
            router.push('/');
          }
        }
      ]
    );
  };

  // Ouvrir le modal d'édition
  const openEditModal = (ligne: LigneAchat) => {
    setSelectedLigne(ligne);
    setShowEditModal(true);
  };

  // Filtrer les produits pour la recherche
  const filteredProduits = produits.filter(p =>
    p.libelle.toLowerCase().includes(searchProduit.toLowerCase())
  );
  
  // === FONCTIONS DE GESTION CRUD DES PRODUITS ===
  
  // Ajouter un nouveau produit
  const handleAddProduitToDb = () => {
    if (!produitLibelle.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de produit');
      return;
    }

    try {
      const db = getDb();
      db.runSync('INSERT INTO Produit (libelle) VALUES (?)', [produitLibelle.trim()]);
      
      setProduitLibelle('');
      setShowAddProduitModal(false);
      loadData(); // Recharger pour actualiser la liste des produits
      Alert.alert('Succès', 'Produit ajouté à la base de données !');
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter le produit');
    }
  };

  // Modifier un produit existant dans la DB
  const handleEditProduitInDb = () => {
    if (!selectedProduit || !produitLibelle.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de produit');
      return;
    }

    try {
      const db = getDb();
      db.runSync('UPDATE Produit SET libelle = ? WHERE id = ?', [produitLibelle.trim(), selectedProduit.id]);
      
      setSelectedProduit(null);
      setProduitLibelle('');
      setShowEditProduitModal(false);
      loadData(); // Recharger pour actualiser
      Alert.alert('Succès', 'Produit modifié avec succès !');
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      Alert.alert('Erreur', 'Impossible de modifier le produit');
    }
  };

  // Supprimer un produit de la DB
  const handleDeleteProduitFromDb = (produit: Produit) => {
    Alert.alert(
      'Confirmer la suppression',
      `Voulez-vous vraiment supprimer "${produit.libelle}" de la base de données ?\n\nAttention : Ce produit ne pourra plus être ajouté aux futurs achats.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            try {
              const db = getDb();
              db.runSync('DELETE FROM Produit WHERE id = ?', [produit.id]);
              loadData(); // Recharger
              Alert.alert('Succès', 'Produit supprimé de la base');
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le produit');
            }
          }
        }
      ]
    );
  };

  // Ouvrir le modal d'édition d'un produit
  const openEditProduitModal = (produit: Produit) => {
    setSelectedProduit(produit);
    setProduitLibelle(produit.libelle);
    setShowEditProduitModal(true);
  };
  
  // === FONCTIONS DE GESTION DU NOM DE LISTE ===
  
  // Ouvrir le modal de modification du nom de liste (inline editing)
  const openEditListNameModal = () => {
    setNewListName(achat?.nomListe || '');
    setShowEditListNameModal(true);
  };
  
  // Enregistrer le nouveau nom de liste (sans modal, inline)
  const handleSaveListName = () => {
    if (!newListName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom de liste');
      return;
    }

    try {
      const db = getDb();
      db.runSync('UPDATE Achat SET nomListe = ? WHERE id = ?', [newListName.trim(), achatId]);
      
      setShowEditListNameModal(false);
      loadData();
    } catch (error) {
      console.error('Erreur lors de la modification:', error);
      Alert.alert('Erreur', 'Impossible de modifier le nom de liste');
    }
  };
  
  // Supprimer la liste d'achat
  const handleDeleteList = () => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cette liste d\'achat ? Tous les produits associés seront également supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            try {
              const db = getDb();
              db.runSync('DELETE FROM LigneAchat WHERE idAchat = ?', [achatId]);
              db.runSync('DELETE FROM Achat WHERE id = ?', [achatId]);
              
              Alert.alert('Succès', 'Liste supprimée', [
                { text: 'OK', onPress: () => router.push('/') }
              ]);
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la liste');
            }
          }
        }
      ]
    );
  };
  
  // Créer une copie de la liste
  const handleDuplicateList = () => {
    try {
      const db = getDb();
      
      // Créer une nouvelle liste avec le même nom + " (Copie)"
      const newNom = `${achat?.nomListe} (Copie)`;
      const now = new Date().toISOString();
      
      db.runSync(
        'INSERT INTO Achat (nomListe, dateAchat, montantTotal) VALUES (?, ?, ?)',
        [newNom, now, totalGeneral]
      );
      
      // Récupérer l'ID de la nouvelle liste
      const result = db.getFirstSync<{ id: number }>('SELECT last_insert_rowid() as id');
      const newAchatId = result?.id;
      
      if (newAchatId) {
        // Copier toutes les lignes d'achat
        for (const ligne of lignesAchat) {
          db.runSync(
            'INSERT INTO LigneAchat (idAchat, idProduit, quantite, prixUnitaire, prixTotal) VALUES (?, ?, ?, ?, ?)',
            [newAchatId, ligne.idProduit, ligne.quantite, ligne.prixUnitaire, ligne.prixTotal]
          );
        }
        
        Alert.alert('Succès', 'Liste copiée !', [
          { text: 'OK', onPress: () => router.push(`/achat/${newAchatId}`) }
        ]);
      }
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      Alert.alert('Erreur', 'Impossible de copier la liste');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="basket" size={60} color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header style Google Keep */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          {/* Titre éditable inline (comme Google Keep) */}
          <View style={styles.headerInfo}>
            {showEditListNameModal ? (
              <TextInput
                style={styles.headerTitleInput}
                value={newListName}
                onChangeText={setNewListName}
                onBlur={() => {
                  if (newListName.trim()) {
                    handleSaveListName();
                  } else {
                    setShowEditListNameModal(false);
                    setNewListName(achat?.nomListe || '');
                  }
                }}
                autoFocus
                placeholder="Titre"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            ) : (
              <TouchableOpacity onPress={openEditListNameModal}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {achat?.nomListe}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles.headerSubtitle}>
              {achat && format(new Date(achat.dateAchat), 'dd MMMM yyyy à HH:mm')}
            </Text>
          </View>
          
          {/* Actions en haut (style Google Keep) */}
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={() => setShowManageProduitsModal(true)}
            >
              <Ionicons name="settings-outline" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerActionButton}
              onPress={() => setShowHeaderMenuModal(true)}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Résumé */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Ionicons name="basket" size={20} color={SECTION_COLORS.achats.primary} />
            <Text style={styles.summaryLabel}>Articles</Text>
            <Text style={styles.summaryValue}>{lignesAchat.length}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Ionicons name="cash" size={20} color={SECTION_COLORS.achats.primary} />
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>{totalGeneral.toLocaleString()} Ar</Text>
          </View>
        </View>
      </View>

      {/* Liste des produits */}
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Produits ajoutés</Text>
        
        <FlatList
          data={lignesAchat}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.libelleProduit}</Text>
                <View style={styles.productDetails}>
                  <Text style={styles.productQuantity}>
                    Qté: {item.quantite}
                  </Text>
                  <Text style={styles.productPrice}>
                    {item.prixUnitaire.toLocaleString()} Ar/unité
                  </Text>
                </View>
              </View>
              <View style={styles.productActions}>
                <Text style={styles.productTotal}>
                  {item.prixTotal.toLocaleString()} Ar
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="pencil" size={16} color={SECTION_COLORS.achats.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteProduit(item)}
                  >
                    <Ionicons name="trash" size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={48} color="#ddd" />
              <Text style={styles.emptyTitle}>Aucun produit ajouté</Text>
              <Text style={styles.emptyText}>
                Commencez par ajouter des produits à votre liste
              </Text>
            </View>
          }
        />
      </View>

      {/* Bouton de validation */}
      {lignesAchat.length > 0 && (
        <View style={styles.validateContainer}>
          <TouchableOpacity style={styles.validateButton} onPress={handleValidateList}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <Text style={styles.validateButtonText}>Valider la liste</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal d'ajout de produit avec checkbox */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowAddModal(false);
                setProduitsAjoutesTemp([]);
                setSearchProduit('');
              }} 
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ajouter des produits</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Barre de recherche */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un produit..."
                  value={searchProduit}
                  onChangeText={setSearchProduit}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Badge de sélection */}
            {produitsAjoutesTemp.length > 0 && (
              <View style={styles.selectionBadge}>
                <Ionicons name="checkmark-circle" size={20} color={SECTION_COLORS.achats.primary} />
                <Text style={styles.selectionBadgeText}>
                  {produitsAjoutesTemp.length} produit(s) ajouté(s)
                </Text>
              </View>
            )}

            {/* Liste des produits disponibles */}
            <View style={styles.productsSection}>
              <Text style={styles.sectionTitle}>Produits disponibles</Text>
              <View style={styles.productsList}>
                {filteredProduits.map((produit) => (
                  <TouchableOpacity
                    key={produit.id}
                    style={styles.checkboxItem}
                    onPress={() => handleQuickAddProduit(produit)}
                  >
                    <Ionicons name="add-circle-outline" size={24} color={SECTION_COLORS.achats.primary} />
                    <Text style={styles.checkboxLabel}>{produit.libelle}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Liste des produits ajoutés temporairement */}
            {produitsAjoutesTemp.length > 0 && (
              <View style={styles.tempProduitsSection}>
                <Text style={styles.sectionTitle}>Produits ajoutés ({produitsAjoutesTemp.length})</Text>
                {produitsAjoutesTemp.map((produit) => (
                  <View key={produit.id} style={styles.tempProduitCard}>
                    <View style={styles.tempProduitLeft}>
                      <TouchableOpacity
                        style={styles.checkboxToggle}
                        onPress={() => toggleProduitDetails(produit.id)}
                      >
                        <Ionicons
                          name={selectedForDetails[produit.id] ? "checkbox" : "square-outline"}
                          size={24}
                          color={SECTION_COLORS.achats.primary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.tempProduitName}>{produit.libelle}</Text>
                    </View>
                    
                    {/* Afficher les champs si coché */}
                    {selectedForDetails[produit.id] && (
                      <View style={styles.detailsInline}>
                        <TextInput
                          style={styles.smallInput}
                          placeholder="Qté"
                          keyboardType="numeric"
                          value={produitsDetails[produit.id]?.quantite || ''}
                          onChangeText={(v) => updateProduitDetail(produit.id, 'quantite', v)}
                        />
                        <TextInput
                          style={styles.smallInput}
                          placeholder="Prix"
                          keyboardType="numeric"
                          value={produitsDetails[produit.id]?.prix || ''}
                          onChangeText={(v) => updateProduitDetail(produit.id, 'prix', v)}
                        />
                      </View>
                    )}
                    
                    <TouchableOpacity onPress={() => handleRemoveTempProduit(produit.id)}>
                      <Ionicons name="close-circle" size={24} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                setShowAddModal(false);
                setProduitsAjoutesTemp([]);
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton, 
                styles.confirmButton,
                produitsAjoutesTemp.length === 0 && styles.confirmButtonDisabled
              ]}
              onPress={handleSaveAllTempProduits}
              disabled={produitsAjoutesTemp.length === 0}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.confirmButtonText}>
                Valider ({produitsAjoutesTemp.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de modification de produit */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowEditModal(false)} 
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Modifier {selectedLigne?.libelleProduit || 'le produit'}
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.modalContent}>
            {selectedLigne && (
              <View style={styles.detailsSection}>
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Quantité</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={selectedLigne.quantite.toString()}
                      onChangeText={(value) => setSelectedLigne({...selectedLigne, quantite: Number.parseFloat(value) || 0})}
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Prix unitaire (Ar)</Text>
                    <TextInput
                      style={styles.numberInput}
                      value={selectedLigne.prixUnitaire.toString()}
                      onChangeText={(value) => setSelectedLigne({...selectedLigne, prixUnitaire: Number.parseFloat(value) || 0})}
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                <View style={styles.totalPreview}>
                  <Text style={styles.totalPreviewText}>
                    Total: {(selectedLigne.quantite * selectedLigne.prixUnitaire).toLocaleString()} Ar
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleEditProduit}
            >
              <Ionicons name="save" size={20} color="white" />
              <Text style={styles.confirmButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de gestion des produits */}
      <Modal
        visible={showManageProduitsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowManageProduitsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowManageProduitsModal(false)} 
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Gestion des produits</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.modalContent}>
            {/* Barre de recherche pour la gestion des produits */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un produit..."
                  value={searchGestionProduit}
                  onChangeText={setSearchGestionProduit}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Liste des produits pour gestion */}
            <View style={styles.productsSection}>
              <Text style={styles.sectionTitle}>Tous les produits</Text>
              <View style={styles.productsList}>
                {produits.filter(p => 
                  p.libelle.toLowerCase().includes(searchGestionProduit.toLowerCase())
                ).map((produit) => (
                  <View
                    key={produit.id}
                    style={styles.produitCard}
                  >
                    <View style={styles.produitIcon}>
                      <Ionicons name="cube-outline" size={24} color={SECTION_COLORS.achats.primary} />
                    </View>
                    <Text style={styles.produitName}>{produit.libelle}</Text>
                    <View style={styles.produitActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditProduitModal(produit)}
                      >
                        <Ionicons name="pencil" size={18} color={SECTION_COLORS.achats.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteProduitFromDb(produit)}
                      >
                        <Ionicons name="trash" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowManageProduitsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Fermer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => {
                setShowManageProduitsModal(false);
                setShowAddProduitModal(true);
              }}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.confirmButtonText}>
                Ajouter un produit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal d'ajout de produit */}
      <Modal
        visible={showAddProduitModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddProduitModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAddProduitModal(false)} 
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Ajouter un produit</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom du produit</Text>
              <TextInput
                style={styles.textInput}
                value={produitLibelle}
                onChangeText={setProduitLibelle}
                placeholder="Entrez le nom du produit"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowAddProduitModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleAddProduitToDb}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.confirmButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal d'édition de produit */}
      <Modal
        visible={showEditProduitModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditProduitModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowEditProduitModal(false)} 
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Modifier {selectedProduit?.libelle || 'le produit'}
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.modalContent}>
            {selectedProduit && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom du produit</Text>
                <TextInput
                  style={styles.textInput}
                  value={produitLibelle}
                  onChangeText={setProduitLibelle}
                  placeholder="Entrez le nom du produit"
                  placeholderTextColor="#999"
                />
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowEditProduitModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleEditProduitInDb}
            >
              <Ionicons name="save" size={20} color="white" />
              <Text style={styles.confirmButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de modification du nom de la liste */}
      <Modal
        visible={showEditListNameModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditListNameModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowEditListNameModal(false)} 
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Modifier le nom de la liste</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom de la liste</Text>
              <TextInput
                style={styles.textInput}
                value={newListName}
                onChangeText={setNewListName}
                placeholder="Entrez le nouveau nom de la liste"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => setShowEditListNameModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={handleSaveListName}
            >
              <Ionicons name="save" size={20} color="white" />
              <Text style={styles.confirmButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de menu d'actions (style Google Keep) */}
      <Modal
        visible={showHeaderMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderMenuModal(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowHeaderMenuModal(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowHeaderMenuModal(false);
                handleDuplicateList();
              }}
            >
              <Ionicons name="copy-outline" size={22} color={COLORS.text} />
              <Text style={styles.menuItemText}>Créer une copie</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowHeaderMenuModal(false);
                handleDeleteList();
              }}
            >
              <Ionicons name="trash-outline" size={22} color={COLORS.error} />
              <Text style={[styles.menuItemText, {color: COLORS.error}]}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  
  // Header
  header: {
    backgroundColor: SECTION_COLORS.achats.primary,
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
  headerTitleInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  listNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editIconInline: {
    marginLeft: 4,
    opacity: 0.9,
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Résumé
  summaryCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: -10,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: SECTION_COLORS.achats.primary,
  },

  // Liste
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  
  // Cartes de produits
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  productDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  productQuantity: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  productPrice: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  productActions: {
    alignItems: 'flex-end',
  },
  productTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SECTION_COLORS.achats.primary,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SECTION_COLORS.achats.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // État vide
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },

  // Validation
  validateContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SECTION_COLORS.achats.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  validateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Nouveaux styles pour les modals modernisées
  searchSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  productsSection: {
    marginBottom: 24,
  },
  productsList: {
    maxHeight: 300,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  productSelectorActive: {
    backgroundColor: SECTION_COLORS.achats.light,
    borderColor: SECTION_COLORS.achats.primary,
  },
  productNameActive: {
    color: SECTION_COLORS.achats.primary,
    fontWeight: '600',
  },
  quickAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  detailsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  numberInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
  },
  totalPreview: {
    backgroundColor: SECTION_COLORS.achats.light,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  totalPreviewText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SECTION_COLORS.achats.primary,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  confirmButton: {
    backgroundColor: SECTION_COLORS.achats.primary,
    shadowColor: SECTION_COLORS.achats.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },

  // Nouveaux styles pour le nouveau système d'ajout
  tempProduitsSection: {
    backgroundColor: SECTION_COLORS.achats.light,
    padding: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  tempProduitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  tempProduitLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxToggle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tempProduitName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  detailsInline: {
    flexDirection: 'row',
    gap: 8,
  },
  smallInput: {
    width: 70,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    textAlign: 'center',
  },
  selectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SECTION_COLORS.achats.light,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  selectionBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: SECTION_COLORS.achats.primary,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'white',
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
    textAlign: 'center',
  },
  productDetailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productDetailName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailInputGroup: {
    flex: 1,
  },
  detailInputLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  detailInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  productDetailTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  productDetailTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  productDetailTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: SECTION_COLORS.achats.primary,
  },
  produitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  produitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SECTION_COLORS.achats.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  produitName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  produitActions: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },

  // Styles pour le menu d'actions (style Google Keep)
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
});
