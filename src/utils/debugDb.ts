// src/utils/debugDb.ts
import { getDb } from '../db/init';

export const debugDatabase = () => {
  try {
    const db = getDb();
    
    console.log('========== DEBUG DATABASE ==========');
    
    // 1. Structure de ListeAchat
    const listeAchatCols = db.getAllSync(`PRAGMA table_info(ListeAchat)`);
    console.log('[DEBUG] ListeAchat columns:', listeAchatCols.map((c: any) => c.name));
    
    // 2. Structure de Article
    const articleCols = db.getAllSync(`PRAGMA table_info(Article)`);
    console.log('[DEBUG] Article columns:', articleCols.map((c: any) => c.name));
    
    // 3. Toutes les listes
    const allListes = db.getAllSync(`SELECT * FROM ListeAchat ORDER BY dateAchat DESC LIMIT 10`);
    console.log('[DEBUG] ListeAchat data (10 dernières):', JSON.stringify(allListes, null, 2));
    
    // 4. Tous les articles
    const allArticles = db.getAllSync(`SELECT * FROM Article LIMIT 10`);
    console.log('[DEBUG] Article data (10 premiers):', JSON.stringify(allArticles, null, 2));
    
    // 5. Comptage
    const countListes = db.getFirstSync(`SELECT COUNT(*) as count FROM ListeAchat`) as any;
    const countArticles = db.getFirstSync(`SELECT COUNT(*) as count FROM Article`) as any;
    console.log('[DEBUG] Total listes:', countListes?.count);
    console.log('[DEBUG] Total articles:', countArticles?.count);
    
    // 6. Test join
    const joinTest = db.getAllSync(`
      SELECT l.idListe, l.nomListe, l.dateAchat, COUNT(a.idArticle) as nbArticles, SUM(a.prixTotal) as total
      FROM ListeAchat l
      LEFT JOIN Article a ON l.idListe = a.idListeAchat
      GROUP BY l.idListe
      LIMIT 5
    `);
    console.log('[DEBUG] Join test:', JSON.stringify(joinTest, null, 2));
    
    console.log('====================================');
    
    return {
      listeCount: countListes?.count || 0,
      articleCount: countArticles?.count || 0,
      sampleListes: allListes,
      sampleArticles: allArticles,
    };
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    return null;
  }
};