import { AchatRepo, ListeAchat } from '../repositories/achatRepo';
import { getDb } from '../db/init';

export const DepenseService = {
  /**
   * @param month 
   * @param year 
   */
  async calculerDepensesMensuelles(month: number, year: number): Promise<number> {
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0).toISOString();
    const achats = await AchatRepo.getAchatsByPeriod(startDate, endDate);
    return (achats as ListeAchat[]).reduce((total, achat) => total + (achat.montantTotal || 0), 0);
  },
  async calculerTotalGlobal(): Promise<number> {
    const achats = await AchatRepo.listAchats();
    return (achats as ListeAchat[]).reduce((total, achat) => total + (achat.montantTotal || 0), 0);
  },
  async getDepensesParJour(month: number, year: number) {
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0).toISOString();
    const achats = await AchatRepo.getAchatsByPeriod(startDate, endDate);
    const result: Record<string, number> = {};
    for (const achat of (achats as ListeAchat[])) {
      const day = achat.dateAchat.split('T')[0]; 
      result[day] = (result[day] || 0) + (achat.montantTotal || 0);
    }
    return result;
  },

  
  async getRepartitionParProduit() {
    const db = getDb();
    const res = db.getAllSync(`
      SELECT p.libelle as name, SUM(a.prixTotal) as montant
      FROM Article a
      JOIN Produit p ON p.idProduit = a.idProduit
      GROUP BY p.libelle ORDER BY montant DESC
    `);
    console.log('[DEPENSE_SERVICE] getRepartitionParProduit - Résultat:', res.length, 'produits', res);
    return res as { name: string; montant: number }[];
  },

  async getTotalSurPeriode(startDate: string, endDate: string) {
    const db = getDb();
    const res = db.getAllSync(`
      SELECT COALESCE(SUM(a.prixTotal), 0) as t 
      FROM Article a JOIN ListeAchat l ON l.idListe = a.idListeAchat 
      WHERE DATE(l.dateAchat) BETWEEN ? AND ?
    `, [startDate, endDate]);
    return (res[0] as any)?.t || 0;
  },

  
  async getStatsComparatives(startDate: string, endDate: string) {
    const db = getDb();
    const res = db.getAllSync(`
       SELECT COALESCE(SUM(a.prixTotal), 0) as montant, COUNT(DISTINCT l.idListe) as nb
       FROM ListeAchat l JOIN Article a ON l.idListe = a.idListeAchat
       WHERE DATE(l.dateAchat) BETWEEN ? AND ?`, [startDate, endDate]);
    return {
      montant: (res[0] as any)?.montant || 0,
      nbAchats: (res[0] as any)?.nb || 0
    };
  },

 
  async getDetailsProduitsSurPeriode(startDate: string, endDate: string) {
    const db = getDb();
    // Debug: Afficher les dates de requête
    console.log('[SQL] Requête produits période:', startDate, 'à', endDate);
    
    // Debug: Voir toutes les dates d'achat disponibles
    const allDates = db.getAllSync(`SELECT idListe, dateAchat FROM ListeAchat ORDER BY dateAchat DESC LIMIT 10`);
    console.log('[SQL] Dates achats disponibles:', allDates);
    
    // Requête principale avec paramètres
    const res = db.getAllSync(`
      SELECT p.libelle as libelleProduit, SUM(a.quantite) as totalQte, SUM(a.prixTotal) as totalPrix
      FROM Article a 
      JOIN ListeAchat l ON l.idListe = a.idListeAchat 
      JOIN Produit p ON p.idProduit = a.idProduit
      WHERE DATE(l.dateAchat) BETWEEN ? AND ?
      GROUP BY p.libelle
      ORDER BY totalPrix DESC
    `, [startDate, endDate]);
    
    console.log('[SQL] Résultat:', res.length, 'produits trouvés', res);
    return res as { libelleProduit: string; totalQte: number; totalPrix: number }[];
  }
};
