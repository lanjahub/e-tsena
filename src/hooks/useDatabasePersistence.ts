import { useEffect, useState } from 'react';
import { getDb } from '../db/init';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Hook pour vérifier et assurer la persistance de la base de données
 * Détecte si la base de données a été effacée entre deux sessions
 */
export const useDatabasePersistence = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [wasDatabaseReset, setWasDatabaseReset] = useState(false);

  useEffect(() => {
    const checkPersistence = async () => {
      try {
        const db = getDb();
        
        // Compter les enregistrements actuels
        const produitCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Produit');
        const listeCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM ListeAchat');
        const articleCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Article');
        
        console.log(`📊 [PERSISTENCE CHECK] Produits: ${produitCount?.count}, Listes: ${listeCount?.count}, Articles: ${articleCount?.count}`);
        
        // Récupérer les derniers compteurs sauvegardés
        const lastProduitCount = await AsyncStorage.getItem('@lastProduitCount');
        const lastListeCount = await AsyncStorage.getItem('@lastListeCount');
        const lastArticleCount = await AsyncStorage.getItem('@lastArticleCount');
        
        // Vérifier si les données ont été réinitialisées
        if (lastProduitCount !== null || lastListeCount !== null || lastArticleCount !== null) {
          const currentProduits = produitCount?.count || 0;
          const currentListes = listeCount?.count || 0;
          const currentArticles = articleCount?.count || 0;
          
          const previousProduits = parseInt(lastProduitCount || '0', 10);
          const previousListes = parseInt(lastListeCount || '0', 10);
          const previousArticles = parseInt(lastArticleCount || '0', 10);
          
          // Si les données ont diminué de manière suspecte, c'est qu'il y a eu reset
          if (
            (previousListes > 0 && currentListes === 0) ||
            (previousArticles > 0 && currentArticles === 0) ||
            (previousProduits > 10 && currentProduits === 10) // Seulement les produits par défaut
          ) {
            console.warn('⚠️ [PERSISTENCE] Base de données réinitialisée détectée !');
            console.warn(`   Avant: Produits=${previousProduits}, Listes=${previousListes}, Articles=${previousArticles}`);
            console.warn(`   Après: Produits=${currentProduits}, Listes=${currentListes}, Articles=${currentArticles}`);
            setWasDatabaseReset(true);
          } else {
            console.log('✅ [PERSISTENCE] Données persistées correctement');
          }
        }
        
        // Sauvegarder les compteurs actuels
        await AsyncStorage.setItem('@lastProduitCount', String(produitCount?.count || 0));
        await AsyncStorage.setItem('@lastListeCount', String(listeCount?.count || 0));
        await AsyncStorage.setItem('@lastArticleCount', String(articleCount?.count || 0));
        
        setIsVerified(true);
      } catch (error) {
        console.error('❌ [PERSISTENCE] Erreur lors de la vérification:', error);
        setIsVerified(true);
      }
    };
    
    checkPersistence();
  }, []);

  return { isVerified, wasDatabaseReset };
};
