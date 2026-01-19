import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync('etsena.db');
  }
  return dbInstance;
};

const tableExists = (db: SQLite.SQLiteDatabase, table: string): boolean => {
  try {
    const result = db.getAllSync(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`);
    return result.length > 0;
  } catch {
    return false;
  }
};

const columnExists = (db: SQLite.SQLiteDatabase, table: string, column: string): boolean => {
  try {
    const result = db.getAllSync(`PRAGMA table_info(${table})`);
    return result.some((col: any) => col.name === column);
  } catch {
    return false;
  }
};

const migrateDatabase = (db: SQLite.SQLiteDatabase) => {
  console.log('🔄 Vérification des migrations...');

  // 0. Nettoyer les tables temporaires des migrations précédentes échouées
  try {
    db.execSync(`
      DROP TABLE IF EXISTS ListeAchat_new;
      DROP TABLE IF EXISTS Produit_new;
      DROP TABLE IF EXISTS Article_new;
      DROP TABLE IF EXISTS Rappel_new;
    `);
    console.log('🧹 Tables temporaires nettoyées');
  } catch (e) {
    console.warn('⚠️ Erreur nettoyage tables temporaires:', e);
  }

  // 1. Renommage des tables (Achat -> ListeAchat, Notification -> Rappel, LigneAchat -> Article)
  if (tableExists(db, 'Achat') && !tableExists(db, 'ListeAchat')) {
    console.log('📝 Migration: Renommage Achat -> ListeAchat');
    db.execSync('ALTER TABLE Achat RENAME TO ListeAchat');
  }

  if (tableExists(db, 'Notification') && !tableExists(db, 'Rappel')) {
    console.log('📝 Migration: Renommage Notification -> Rappel');
    db.execSync('ALTER TABLE Notification RENAME TO Rappel');
  }

  if (tableExists(db, 'LigneAchat') && !tableExists(db, 'Article')) {
    console.log('📝 Migration: Renommage LigneAchat -> Article');
    db.execSync('ALTER TABLE LigneAchat RENAME TO Article');
  }

  // 1.5 Migration: Renommer les colonnes id en idListe, idArticle, idProduit, idRappel
  // Migration ListeAchat: id -> idListe
  try {
    if (tableExists(db, 'ListeAchat') && columnExists(db, 'ListeAchat', 'id') && !columnExists(db, 'ListeAchat', 'idListe')) {
      console.log('📝 Migration: ListeAchat.id -> idListe');
      db.execSync(`
        CREATE TABLE ListeAchat_new (
          idListe INTEGER PRIMARY KEY AUTOINCREMENT,
          nomListe TEXT,
          dateAchat TEXT,
          montantTotal REAL DEFAULT 0,
          statut INTEGER DEFAULT 0
        );
        INSERT INTO ListeAchat_new (idListe, nomListe, dateAchat, montantTotal, statut)
        SELECT id, nomListe, dateAchat, montantTotal, statut FROM ListeAchat;
        DROP TABLE ListeAchat;
        ALTER TABLE ListeAchat_new RENAME TO ListeAchat;
      `);
      console.log('✅ Migration ListeAchat réussie');
    }
  } catch (e) {
    console.error('❌ Erreur migration ListeAchat:', e);
  }

  // Migration Produit: id -> idProduit
  try {
    if (tableExists(db, 'Produit') && columnExists(db, 'Produit', 'id') && !columnExists(db, 'Produit', 'idProduit')) {
      console.log('📝 Migration: Produit.id -> idProduit');
      db.execSync(`
        CREATE TABLE Produit_new (
          idProduit INTEGER PRIMARY KEY AUTOINCREMENT,
          libelle TEXT NOT NULL,
          unite TEXT DEFAULT 'pcs'
        );
        INSERT INTO Produit_new (idProduit, libelle, unite)
        SELECT id, libelle, unite FROM Produit;
        DROP TABLE Produit;
        ALTER TABLE Produit_new RENAME TO Produit;
      `);
      console.log('✅ Migration Produit réussie');
    }
  } catch (e) {
    console.error('❌ Erreur migration Produit:', e);
  }

  // Migration Article: id -> idArticle ET idAchat -> idListeAchat
  try {
    if (tableExists(db, 'Article')) {
      const hasOldId = columnExists(db, 'Article', 'id') && !columnExists(db, 'Article', 'idArticle');
      const hasOldFK = columnExists(db, 'Article', 'idAchat');
      const hasLibelle = columnExists(db, 'Article', 'libelleProduit');
      
      if (hasOldId || hasOldFK || hasLibelle) {
        console.log('📝 Migration: Article (id->idArticle, idAchat->idListeAchat, normalisation)');
        
        // Créer les produits manquants si la colonne libelleProduit existe
        if (hasLibelle && tableExists(db, 'Produit')) {
          console.log('🔄 Création des produits manquants depuis Article.libelleProduit');
          db.execSync(`
            INSERT OR IGNORE INTO Produit (libelle, unite)
            SELECT DISTINCT libelleProduit, COALESCE(unite, 'pcs') 
            FROM Article 
            WHERE libelleProduit IS NOT NULL AND libelleProduit != ''
          `);
          const nbProduits = db.getAllSync('SELECT COUNT(*) as cnt FROM Produit')[0] as {cnt: number};
          console.log(`✅ ${nbProduits.cnt} produits dans la table Produit`);
        }
        
        db.execSync(`
          CREATE TABLE Article_new (
            idArticle INTEGER PRIMARY KEY AUTOINCREMENT,
            idListeAchat INTEGER NOT NULL,
            idProduit INTEGER NOT NULL,
            quantite REAL DEFAULT 1,
            prixUnitaire REAL DEFAULT 0,
            prixTotal REAL DEFAULT 0,
            unite TEXT DEFAULT 'pcs',
            estCoche INTEGER DEFAULT 0,
            libelleProduit TEXT,
            FOREIGN KEY (idListeAchat) REFERENCES ListeAchat(idListe) ON DELETE CASCADE,
            FOREIGN KEY (idProduit) REFERENCES Produit(idProduit)
          );
        `);

        // Insertion des données selon la structure existante
        if (hasLibelle) {
          console.log('🔄 Migration des articles avec jointure sur libelleProduit');
          db.execSync(`
            INSERT INTO Article_new (idArticle, idListeAchat, idProduit, quantite, prixUnitaire, prixTotal, unite, estCoche, libelleProduit)
            SELECT 
              a.${hasOldId ? 'id' : 'idArticle'},
              a.${hasOldFK ? 'idAchat' : 'idListeAchat'},
              p.idProduit,
              a.quantite,
              a.prixUnitaire,
              a.prixTotal,
              a.unite,
              COALESCE(a.estCoche, 0),
              a.libelleProduit
            FROM Article a
            INNER JOIN Produit p ON p.libelle = a.libelleProduit
            WHERE a.libelleProduit IS NOT NULL AND a.libelleProduit != ''
          `);
          const nbArticles = db.getAllSync('SELECT COUNT(*) as cnt FROM Article_new')[0] as {cnt: number};
          console.log(`✅ ${nbArticles.cnt} articles migrés avec succès`);
        } else {
          db.execSync(`
            INSERT INTO Article_new (idArticle, idListeAchat, idProduit, quantite, prixUnitaire, prixTotal, unite, estCoche)
            SELECT 
              ${hasOldId ? 'id' : 'idArticle'},
              ${hasOldFK ? 'idAchat' : 'idListeAchat'},
              idProduit,
              quantite,
              prixUnitaire,
              prixTotal,
              unite,
              estCoche
            FROM Article
          `);
        }

        db.execSync('DROP TABLE Article');
        db.execSync('ALTER TABLE Article_new RENAME TO Article');
        console.log('✅ Migration Article réussie');
      }
    }
  } catch (e) {
    console.error('❌ Erreur migration Article:', e);
  }

  // Migration Rappel: id -> idRappel ET achatId -> idListeAchat
  try {
    if (tableExists(db, 'Rappel')) {
      const hasOldId = columnExists(db, 'Rappel', 'id') && !columnExists(db, 'Rappel', 'idRappel');
      const hasOldFK = columnExists(db, 'Rappel', 'achatId');
      const hasRead = columnExists(db, 'Rappel', 'read');
      const hasLu = columnExists(db, 'Rappel', 'lu');
      const hasEstLu = columnExists(db, 'Rappel', 'estLu');
      const hasType = columnExists(db, 'Rappel', 'type');
      const hasSupprime = columnExists(db, 'Rappel', 'supprime');
      const hasAffiche = columnExists(db, 'Rappel', 'affiche');
      const hasNotificationId = columnExists(db, 'Rappel', 'notificationId');
      const hasCreatedAt = columnExists(db, 'Rappel', 'createdAt');
      
      // Détermine quelle colonne "lu" utiliser
      let luColumn = 'COALESCE(estLu, 0)';
      if (!hasEstLu && hasRead) {
        luColumn = 'COALESCE(read, 0)';
      } else if (!hasEstLu && hasLu) {
        luColumn = 'COALESCE(lu, 0)';
      }
      
      if (hasOldId || hasOldFK || hasRead || hasLu || !hasEstLu) {
        console.log('📝 Migration: Rappel (normalisation complète)');
        db.execSync(`
          CREATE TABLE Rappel_new (
            idRappel INTEGER PRIMARY KEY AUTOINCREMENT,
            idListeAchat INTEGER NOT NULL,
            titre TEXT NOT NULL,
            message TEXT,
            dateRappel TEXT NOT NULL,
            heureRappel TEXT NOT NULL,
            type TEXT DEFAULT 'rappel',
            estLu INTEGER DEFAULT 0,
            supprime INTEGER DEFAULT 0,
            affiche INTEGER DEFAULT 0,
            notificationId TEXT,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (idListeAchat) REFERENCES ListeAchat(idListe)
          );
        `);
        
        // Construction dynamique de l'INSERT
        const idCol = hasOldId ? 'id' : 'idRappel';
        const fkCol = hasOldFK ? 'achatId' : 'idListeAchat';
        const typeCol = hasType ? 'COALESCE(type, \'rappel\')' : '\'rappel\'';
        const supprimeCol = hasSupprime ? 'COALESCE(supprime, 0)' : '0';
        const afficheCol = hasAffiche ? 'COALESCE(affiche, 0)' : '0';
        const notifIdCol = hasNotificationId ? 'notificationId' : 'NULL';
        const createdCol = hasCreatedAt ? 'COALESCE(createdAt, CURRENT_TIMESTAMP)' : 'CURRENT_TIMESTAMP';
        
        db.execSync(`
          INSERT INTO Rappel_new (idRappel, idListeAchat, titre, message, dateRappel, heureRappel, type, estLu, supprime, affiche, notificationId, createdAt)
          SELECT 
            ${idCol},
            ${fkCol},
            titre,
            message,
            dateRappel,
            heureRappel,
            ${typeCol},
            ${luColumn},
            ${supprimeCol},
            ${afficheCol},
            ${notifIdCol},
            ${createdCol}
          FROM Rappel;
        `);
        
        db.execSync('DROP TABLE Rappel');
        db.execSync('ALTER TABLE Rappel_new RENAME TO Rappel');
        console.log('✅ Migration Rappel réussie');
      }
    }
  } catch (e) {
    console.error('❌ Erreur migration Rappel:', e);
  }
};

export const initDatabase = () => {
  console.log('🚀 Initialisation de la base de données...');
  const db = getDb();
  
  db.execSync('PRAGMA journal_mode = WAL;');

  db.execSync(`
    CREATE TABLE IF NOT EXISTS Produit (
      idProduit INTEGER PRIMARY KEY AUTOINCREMENT,
      libelle TEXT NOT NULL,
      unite TEXT DEFAULT 'pcs');
    CREATE TABLE IF NOT EXISTS ListeAchat (
      idListe INTEGER PRIMARY KEY AUTOINCREMENT,
      nomListe TEXT,
      dateAchat TEXT,
      montantTotal REAL DEFAULT 0,
      statut INTEGER DEFAULT 0 );
    CREATE TABLE IF NOT EXISTS Article (
      idArticle INTEGER PRIMARY KEY AUTOINCREMENT,
      idListeAchat INTEGER NOT NULL,
      idProduit INTEGER NOT NULL,
      quantite REAL DEFAULT 1,
      prixUnitaire REAL DEFAULT 0,
      prixTotal REAL DEFAULT 0,
      unite TEXT DEFAULT 'pcs',
      estCoche INTEGER DEFAULT 0,
      libelleProduit TEXT,
      FOREIGN KEY (idListeAchat) REFERENCES ListeAchat(idListe) ON DELETE CASCADE,
      FOREIGN KEY (idProduit) REFERENCES Produit(idProduit) );
   CREATE TABLE IF NOT EXISTS Rappel (
    idRappel INTEGER PRIMARY KEY AUTOINCREMENT,
    idListeAchat INTEGER NOT NULL,
    titre TEXT NOT NULL,
    message TEXT,
    dateRappel TEXT NOT NULL,
    heureRappel TEXT NOT NULL,
    type TEXT DEFAULT 'rappel',
    estLu INTEGER DEFAULT 0,
    supprime INTEGER DEFAULT 0,
    affiche INTEGER DEFAULT 0,
    notificationId TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idListeAchat) REFERENCES ListeAchat(idListe)
  );
  `);
  
  console.log('✅ Tables créées (ou existantes)');
  
  migrateDatabase(db);
  
  try {
    const count = db.getFirstSync<{ c: number }>('SELECT COUNT(*) as c FROM Produit');
    if (!count || count.c === 0) {
      console.log('📝 Insertion des produits par défaut...');
      const produits = [
        { libelle: 'Riz', unite: 'kg' },
        { libelle: 'Huile', unite: 'L' },
        { libelle: 'Lait', unite: 'L' },
        { libelle: 'Pain', unite: 'pcs' },
        { libelle: 'Poulet', unite: 'kg' },
        { libelle: 'Cahier', unite: 'pcs' },
        { libelle: 'Stylo', unite: 'pcs' },
        { libelle: 'Savon', unite: 'pcs' },
        { libelle: 'Tomate', unite: 'kg' },
        { libelle: 'Oignon', unite: 'kg' },
      ];
      
      produits.forEach(p => {
        db.runSync(
          'INSERT INTO Produit (libelle, unite) VALUES (?, ?)',
          [p.libelle, p.unite]
        );
      });
      console.log(`✅ ${produits.length} produits insérés`);
    }
  } catch (e) {
    console.warn('⚠️ Erreur insertion produits:', e);
  }
  
  console.log('✅ Base de données initialisée avec succès');
  return true;
};

export const checkDatabase = () => {
  try {
    const db = getDb();
    const tables = db.getAllSync('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('✅ Tables:', tables);
    return true;
  } catch (error) {
    console.error('❌ Erreur vérification DB:', error);
    return false;
  }
};

export const resetDatabase = () => {
  try {
    const db = getDb();
    console.log('🗑️ RESET: Suppression de toutes les tables...');
    
    db.execSync(`
      DROP TABLE IF EXISTS Article;
      DROP TABLE IF EXISTS LigneAchat;
      DROP TABLE IF EXISTS ListeAchat;
      DROP TABLE IF EXISTS Achat;
      DROP TABLE IF EXISTS Rappel;
      DROP TABLE IF EXISTS Notification;
      DROP TABLE IF EXISTS Produit;
    `);
    console.log('✅ Tables supprimées');
    console.log('🔄 Réinitialisation...');
    initDatabase();
    
    console.log('✅ Base de données réinitialisée avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur reset DB:', error);
    return false;
  }
};
