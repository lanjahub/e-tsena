import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import formatMoney from '../utils/formatMoney';
import { SECTION_COLORS } from '@constants/colors';

interface Achat {
  idAchat: number;
  nomListe: string;
  dateAchat: string;
  totalDepense: number;
  nombreArticles: number;
}

interface AchatCardProps {
  achat: Achat;
  onPress?: () => void;
}

export const AchatCard: React.FC<AchatCardProps> = ({ achat, onPress }) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/achat/${achat.idAchat}`);
    }
  };

  // Calculer la progression basée sur le montant
  const progressPercentage = Math.min((achat.totalDepense / 100000) * 100, 100);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.cardContent}>
        
        {/* En-tête : Date Badge + Infos */}
        <View style={styles.topRow}>
             <View style={styles.dateBadge}>
                <Text style={styles.dateDay}>
                  {format(new Date(achat.dateAchat), 'dd')}
                </Text>
                <Text style={styles.dateMonth}>
                  {format(new Date(achat.dateAchat), 'MMM')}
                </Text>
             </View>
             
             <View style={styles.mainInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {achat.nomListe}
                  </Text>
                  <Text style={styles.cardTotal}>
                    {formatMoney(achat.totalDepense)} Ar
                  </Text>
                </View>

                <View style={styles.subInfoRow}>
                   <Text style={styles.cardDate}>
                     {format(new Date(achat.dateAchat), 'dd MMMM yyyy, HH:mm')}
                   </Text>
                </View>

                <View style={styles.metaRow}>
                   <View style={styles.pill}>
                      <Ionicons name="bag-handle" size={12} color={SECTION_COLORS.home.primary} />
                      <Text style={styles.metaText}>
                        {achat.nombreArticles} article{achat.nombreArticles > 1 ? 's' : ''}
                      </Text>
                   </View>
                </View>
             </View>
        </View>

        {/* Barre de progression déplacée en bas proprement */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progressPercentage}%`, backgroundColor: SECTION_COLORS.home.primary }
              ]} 
            />
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4, // Pour éviter que l'ombre soit coupée
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'column',
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dateBadge: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#F0F9FF', // Light Blue bg
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  dateDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0284C7',
    lineHeight: 20,
  },
  dateMonth: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#0284C7',
    fontWeight: '600',
  },
  mainInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  cardTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: SECTION_COLORS.home.primary,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardDate: {
    fontSize: 12,
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 0,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
