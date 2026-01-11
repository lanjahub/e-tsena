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

  // 2. Migration de la structure de Article (idProduit au lieu de libelleProduit)
  if (tableExists(db, 'Article')) {
    const hasLibelle = columnExists(db, 'Article', 'libelleProduit');
    const hasIdProduit = columnExists(db, 'Article', 'idProduit');
    const hasIdAchat = columnExists(db, 'Article', 'idAchat'); // Ancien nom FK

    if (hasLibelle || !hasIdProduit || hasIdAchat) {
      console.log('📝 Migration: Restructuration de la table Article (Normalisation)');
      try {
        // Créer les produits manquants avant la migration
        if (hasLibelle) {
            db.execSync(`
                INSERT INTO Produit (libelle, unite)
                SELECT DISTINCT libelleProduit, unite FROM Article 
                WHERE libelleProduit NOT IN (SELECT libelle FROM Produit)
            `);
        }

        db.execSync('DROP TABLE IF EXISTS Article_new');
        db.execSync(`
          CREATE TABLE Article_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            idListeAchat INTEGER NOT NULL,
            idProduit INTEGER NOT NULL,
            quantite REAL DEFAULT 1,
            prixUnitaire REAL DEFAULT 0,
            prixTotal REAL DEFAULT 0,
            unite TEXT DEFAULT 'pcs',
            estCoche INTEGER DEFAULT 0,
            FOREIGN KEY (idListeAchat) REFERENCES ListeAchat(id) ON DELETE CASCADE,
            FOREIGN KEY (idProduit) REFERENCES Produit(id)
          );
        `);

        // Copie des données
        if (hasLibelle) {
             db.execSync(`
                INSERT INTO Article_new (id, idListeAchat, idProduit, quantite, prixUnitaire, prixTotal, unite, estCoche)
                SELECT 
                    a.id, 
                    a.idAchat, 
                    p.id, 
                    a.quantite, 
                    a.prixUnitaire, 
                    a.prixTotal, 
                    a.unite,
                    COALESCE(a.estCoche, 0)
                FROM Article a
                JOIN Produit p ON p.libelle = a.libelleProduit
            `);
        } 
        else if (hasIdProduit && hasIdAchat) {
             db.execSync(`
                INSERT INTO Article_new (id, idListeAchat, idProduit, quantite, prixUnitaire, prixTotal, unite, estCoche)
                SELECT 
                    id, idAchat, idProduit, quantite, prixUnitaire, prixTotal, unite, estCoche
                FROM Article
            `);
        }

        db.execSync('DROP TABLE Article');
        db.execSync('ALTER TABLE Article_new RENAME TO Article');
        console.log('✅ Migration Article réussie');
      } catch (e) {
        console.error('❌ Erreur migration Article:', e);
      }
    }
  }

  // 3. Migration de la structure de Rappel (achatId -> idListeAchat)
  if (tableExists(db, 'Rappel')) {
      if (columnExists(db, 'Rappel', 'achatId') && !columnExists(db, 'Rappel', 'idListeAchat')) {
          console.log('📝 Migration: Restructuration de Rappel');
          try {
              db.execSync('ALTER TABLE Rappel RENAME COLUMN achatId TO idListeAchat');
          } catch (e) {
              console.error('❌ Erreur migration Rappel:', e);
          }
      }
      if (columnExists(db, 'Rappel', 'read')) {
          try { db.execSync('ALTER TABLE Rappel RENAME COLUMN read TO estLu'); } catch {}
      }
  }
};

export const initDatabase = () => {
  console.log('🚀 Initialisation de la base de données...');
  const db = getDb();
  
  db.execSync('PRAGMA journal_mode = WAL;');

  db.execSync(`
    CREATE TABLE IF NOT EXISTS Produit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      libelle TEXT NOT NULL,
      unite TEXT DEFAULT 'pcs'
    );
    CREATE TABLE IF NOT EXISTS ListeAchat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomListe TEXT,
      dateAchat TEXT,
      montantTotal REAL DEFAULT 0,
      notes TEXT,
      statut INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS Article (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idListeAchat INTEGER NOT NULL,
      idProduit INTEGER NOT NULL,
      quantite REAL DEFAULT 1,
      prixUnitaire REAL DEFAULT 0,
      prixTotal REAL DEFAULT 0,
      unite TEXT DEFAULT 'pcs',
      estCoche INTEGER DEFAULT 0,
      FOREIGN KEY (idListeAchat) REFERENCES ListeAchat(id) ON DELETE CASCADE,
      FOREIGN KEY (idProduit) REFERENCES Produit(id)
    );
    CREATE TABLE IF NOT EXISTS Rappel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idListeAchat INTEGER,
      titre TEXT NOT NULL,
      message TEXT NOT NULL,
      dateRappel TEXT NOT NULL,
      heureRappel TEXT NOT NULL,
      type TEXT DEFAULT 'rappel',
      estLu INTEGER DEFAULT 0,
      supprime INTEGER DEFAULT 0,
      notificationId TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (idListeAchat) REFERENCES ListeAchat(id) ON DELETE CASCADE
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
