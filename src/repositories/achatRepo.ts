import { getDb } from '@db/init';

export type Achat = {
  id?: number;
  nomListe: string;
  dateAchat: string; // ISO date
  montantTotal?: number;
  notes?: string;
};

export type LigneAchat = {
  id?: number;
  idAchat: number;
  idProduit: number;
  quantite: number;
  prixUnitaire: number;
  prixTotal?: number;
  estCoche?: boolean;
};

export const AchatRepo = {
  async createAchat(a: Achat) {
    const db = getDb();
    const res = db.runSync(
      `INSERT INTO Achat(nomListe, dateAchat, montantTotal, notes) VALUES(?,?,?,?)`,
      [a.nomListe, a.dateAchat, a.montantTotal ?? 0, a.notes ?? null]
    );
    return (res?.lastInsertRowId as number) ?? 0;
  },

  async listAchats() {
    const db = getDb();
    return db.getAllSync(`SELECT * FROM Achat ORDER BY dateAchat DESC`);
  },

  async addLigne(l: LigneAchat) {
    const db = getDb();
    const prixTotal = (l.prixTotal ?? l.quantite * l.prixUnitaire);
    db.runSync(
      `INSERT INTO LigneAchat(idAchat, idProduit, quantite, prixUnitaire, prixTotal, estCoche)
       VALUES(?,?,?,?,?,?)`,
      [l.idAchat, l.idProduit, l.quantite, l.prixUnitaire, prixTotal, l.estCoche ? 1 : 0]
    );
    db.runSync(
      `UPDATE Achat SET montantTotal = (
        SELECT COALESCE(SUM(prixTotal),0) FROM LigneAchat WHERE idAchat = ?
      ) WHERE id = ?`,
      [l.idAchat, l.idAchat]
    );
  },

  async getLignes(idAchat: number) {
    const db = getDb();
    return db.getAllSync(
      `SELECT l.*, p.libelle FROM LigneAchat l JOIN Produit p ON p.id = l.idProduit WHERE idAchat = ?`,
      [idAchat]
    );
  },

  // Modifier le nom d'une liste d'achat
  async updateAchat(id: number, nomListe: string) {
    const db = getDb();
    db.runSync(
      `UPDATE Achat SET nomListe = ? WHERE id = ?`,
      [nomListe, id]
    );
  },

  // Supprimer une ligne d'achat
  async deleteLigne(id: number, idAchat: number) {
    const db = getDb();
    db.runSync(`DELETE FROM LigneAchat WHERE id = ?`, [id]);
    // Recalculer le total de l'achat
    db.runSync(
      `UPDATE Achat SET montantTotal = (
        SELECT COALESCE(SUM(prixTotal),0) FROM LigneAchat WHERE idAchat = ?
      ) WHERE id = ?`,
      [idAchat, idAchat]
    );
  },

  // Modifier une ligne d'achat
  async updateLigne(id: number, idAchat: number, quantite: number, prixUnitaire: number) {
    const db = getDb();
    const prixTotal = quantite * prixUnitaire;
    db.runSync(
      `UPDATE LigneAchat SET quantite = ?, prixUnitaire = ?, prixTotal = ? WHERE id = ?`,
      [quantite, prixUnitaire, prixTotal, id]
    );
    // Recalculer le total de l'achat
    db.runSync(
      `UPDATE Achat SET montantTotal = (
        SELECT COALESCE(SUM(prixTotal),0) FROM LigneAchat WHERE idAchat = ?
      ) WHERE id = ?`,
      [idAchat, idAchat]
    );
  },

  // Supprimer un achat et toutes ses lignes
  async deleteAchat(id: number) {
    const db = getDb();
    db.runSync(`DELETE FROM LigneAchat WHERE idAchat = ?`, [id]);
    db.runSync(`DELETE FROM Achat WHERE id = ?`, [id]);
  },

  // Obtenir les achats par période
  async getAchatsByPeriod(dateDebut: string, dateFin: string) {
    const db = getDb();
    return db.getAllSync(
      `SELECT * FROM Achat 
       WHERE dateAchat BETWEEN ? AND ? 
       ORDER BY dateAchat DESC`,
      [dateDebut, dateFin]
    );
  },

  // Obtenir un achat par ID
  async getAchatById(id: number) {
    const db = getDb();
    const result = db.getAllSync(`SELECT * FROM Achat WHERE id = ?`, [id]);
    return result[0];
  }
};
