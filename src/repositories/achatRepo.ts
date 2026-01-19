import { getDb } from '@db/init';

export type ListeAchat = {
  idListe?: number;
  nomListe: string;
  dateAchat: string; // ISO date
  montantTotal?: number;
  notes?: string;
  statut?: number;
  // Alias pour compatibilité
  id?: number;
};

export type Article = {
  idArticle?: number;
  idListeAchat: number;
  idProduit?: number;
  libelleProduit?: string; // Pour l'affichage ou la création via libellé
  quantite: number;
  prixUnitaire: number;
  prixTotal?: number;
  estCoche?: boolean;
  unite?: string;
  // Alias pour compatibilité
  id?: number;
};

export const AchatRepo = {
  async createAchat(a: ListeAchat) {
    const db = getDb();
    const res = db.runSync(
      `INSERT INTO ListeAchat(nomListe, dateAchat, montantTotal, notes, statut) VALUES(?,?,?,?,?)`,
      [a.nomListe, a.dateAchat, a.montantTotal ?? 0, a.notes ?? null, a.statut ?? 0]
    );
    return (res?.lastInsertRowId as number) ?? 0;
  },

  async listAchats() {
    const db = getDb();
    return db.getAllSync(`SELECT * FROM ListeAchat ORDER BY dateAchat DESC`);
  },

  async addArticle(l: Article) {
    const db = getDb();
    let productId = l.idProduit;

    // Si pas d'ID produit mais un libellé, on cherche ou crée le produit
    if (!productId && l.libelleProduit) {
      const existing = db.getAllSync<{idProduit: number}>(
        'SELECT idProduit FROM Produit WHERE libelle = ?', 
        [l.libelleProduit]
      );
      
      if (existing && existing.length > 0) {
        productId = existing[0].idProduit;
      } else {
        const res = db.runSync(
          'INSERT INTO Produit (libelle, unite) VALUES (?, ?)',
          [l.libelleProduit, l.unite || 'pcs']
        );
        productId = res.lastInsertRowId as number;
      }
    }

    if (!productId) {
      throw new Error("Impossible d'ajouter un article sans produit valide");
    }

    const prixTotal = (l.prixTotal ?? l.quantite * l.prixUnitaire);
    
    db.runSync(
      `INSERT INTO Article(idListeAchat, idProduit, quantite, prixUnitaire, prixTotal, unite, estCoche)
       VALUES(?,?,?,?,?,?,?)`,
      [l.idListeAchat, productId, l.quantite, l.prixUnitaire, prixTotal, l.unite || 'pcs', l.estCoche ? 1 : 0]
    );

    // Recalculer le total de la liste
    db.runSync(
      `UPDATE ListeAchat SET montantTotal = (
        SELECT COALESCE(SUM(prixTotal),0) FROM Article WHERE idListeAchat = ?
      ) WHERE idListe = ?`,
      [l.idListeAchat, l.idListeAchat]
    );
  },

  // Alias pour compatibilité si nécessaire, mais on préfère addArticle
  async addLigne(l: any) {
      // Mapping ancien format vers nouveau
      const article: Article = {
          idListeAchat: l.idAchat,
          libelleProduit: l.libelleProduit,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          prixTotal: l.prixTotal,
          estCoche: l.estCoche,
          unite: l.unite
      };
      return this.addArticle(article);
  },

  async getArticles(idListeAchat: number) {
    const db = getDb();
    // On joint avec Produit pour récupérer le libellé
    return db.getAllSync(
      `SELECT a.*, p.libelle as libelleProduit 
       FROM Article a 
       JOIN Produit p ON p.idProduit = a.idProduit 
       WHERE a.idListeAchat = ?`,
      [idListeAchat]
    );
  },

  // Alias pour compatibilité
  async getLignes(idAchat: number) {
      return this.getArticles(idAchat);
  },

  // Modifier le nom d'une liste d'achat
  async updateAchat(id: number, nomListe: string) {
    const db = getDb();
    db.runSync(
      `UPDATE ListeAchat SET nomListe = ? WHERE idListe = ?`,
      [nomListe, id]
    );
  },

  // Supprimer un article
  async deleteArticle(id: number, idListeAchat: number) {
    const db = getDb();
    db.runSync(`DELETE FROM Article WHERE idArticle = ?`, [id]);
    // Recalculer le total
    db.runSync(
      `UPDATE ListeAchat SET montantTotal = (
        SELECT COALESCE(SUM(prixTotal),0) FROM Article WHERE idListeAchat = ?
      ) WHERE idListe = ?`,
      [idListeAchat, idListeAchat]
    );
  },

  // Alias
  async deleteLigne(id: number, idAchat: number) {
      return this.deleteArticle(id, idAchat);
  },

  // Modifier un article
  async updateArticle(id: number, idListeAchat: number, quantite: number, prixUnitaire: number) {
    const db = getDb();
    const prixTotal = quantite * prixUnitaire;
    db.runSync(
      `UPDATE Article SET quantite = ?, prixUnitaire = ?, prixTotal = ? WHERE idArticle = ?`,
      [quantite, prixUnitaire, prixTotal, id]
    );
    // Recalculer le total
    db.runSync(
      `UPDATE ListeAchat SET montantTotal = (
        SELECT COALESCE(SUM(prixTotal),0) FROM Article WHERE idListeAchat = ?
      ) WHERE idListe = ?`,
      [idListeAchat, idListeAchat]
    );
  },

  // Alias
  async updateLigne(id: number, idAchat: number, quantite: number, prixUnitaire: number) {
      return this.updateArticle(id, idAchat, quantite, prixUnitaire);
  },

  // Supprimer une liste et ses articles
  async deleteAchat(id: number) {
    const db = getDb();
    db.runSync(`DELETE FROM Article WHERE idListeAchat = ?`, [id]);
    db.runSync(`DELETE FROM ListeAchat WHERE idListe = ?`, [id]);
  },

  // Obtenir les achats par période
  async getAchatsByPeriod(dateDebut: string, dateFin: string) {
    const db = getDb();
    return db.getAllSync(
      `SELECT * FROM ListeAchat 
       WHERE dateAchat BETWEEN ? AND ? 
       ORDER BY dateAchat DESC`,
      [dateDebut, dateFin]
    );
  },

  // Obtenir un achat par ID
  async getAchatById(id: number) {
    const db = getDb();
    const result = db.getAllSync(`SELECT * FROM ListeAchat WHERE idListe = ?`, [id]);
    return result[0];
  }
};
