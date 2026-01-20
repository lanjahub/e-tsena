import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDb } from '../db/init';
import { isRunningInExpoGo } from '../services/notificationService';

interface DbStats {
  produits: number;
  listes: number;
  articles: number;
  rappels: number;
  journalMode: string;
}

export const DatabaseDebugPanel = () => {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadStats = () => {
    try {
      const db = getDb();
      
      const produitCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Produit');
      const listeCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM ListeAchat');
      const articleCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Article');
      const rappelCount = db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM Rappel');
      const journalMode = db.getFirstSync<{ journal_mode: string }>('PRAGMA journal_mode');
      
      setStats({
        produits: produitCount?.count || 0,
        listes: listeCount?.count || 0,
        articles: articleCount?.count || 0,
        rappels: rappelCount?.count || 0,
        journalMode: journalMode?.journal_mode || 'unknown'
      });
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const forceCheckpoint = () => {
    try {
      const db = getDb();
      db.execSync('PRAGMA wal_checkpoint(FULL)');
      Alert.alert('✅ Checkpoint', 'Écriture forcée sur disque effectuée');
      console.log('✅ WAL checkpoint effectué');
    } catch (error) {
      Alert.alert('❌ Erreur', 'Impossible de forcer le checkpoint');
      console.error('Erreur checkpoint:', error);
    }
  };

  if (!__DEV__ && !isRunningInExpoGo()) {
    return null; // Ne pas afficher en production
  }

  if (!isExpanded) {
    return (
      <TouchableOpacity 
        style={styles.collapsedButton}
        onPress={() => {
          setIsExpanded(true);
          loadStats();
        }}
      >
        <Ionicons name="bug" size={20} color="#FFF" />
        <Text style={styles.collapsedText}>DB</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="bug" size={16} color="#FFF" />
          <Text style={styles.title}>Debug Base de Données</Text>
        </View>
        <TouchableOpacity onPress={() => setIsExpanded(false)}>
          <Ionicons name="close" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {isRunningInExpoGo() && (
        <View style={styles.warning}>
          <Ionicons name="warning" size={14} color="#F59E0B" />
          <Text style={styles.warningText}>
            Expo Go - Données non persistantes
          </Text>
        </View>
      )}

      {stats && (
        <View style={styles.stats}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Mode Journal:</Text>
            <Text style={[styles.statValue, stats.journalMode === 'wal' && styles.statValueGood]}>
              {stats.journalMode.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Produits:</Text>
            <Text style={styles.statValue}>{stats.produits}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Listes:</Text>
            <Text style={styles.statValue}>{stats.listes}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Articles:</Text>
            <Text style={styles.statValue}>{stats.articles}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Rappels:</Text>
            <Text style={styles.statValue}>{stats.rappels}</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={loadStats}
        >
          <Ionicons name="refresh" size={16} color="#FFF" />
          <Text style={styles.actionText}>Rafraîchir</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={forceCheckpoint}
        >
          <Ionicons name="save" size={16} color="#FFF" />
          <Text style={styles.actionText}>Force Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  collapsedButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#EF4444',
    width: 50,
    height: 50,
    borderRadius: 25,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  collapsedText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    minWidth: 250,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  warningText: {
    color: '#92400E',
    fontSize: 10,
    flex: 1,
  },
  stats: {
    gap: 6,
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  statValue: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statValueGood: {
    color: '#10B981',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#374151',
    padding: 8,
    borderRadius: 6,
  },
  actionText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
