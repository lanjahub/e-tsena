import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import formatMoney from '../utils/formatMoney';

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
  activeTheme?: any;
  isDarkMode?: boolean;
}

export const AchatCard: React.FC<AchatCardProps> = ({ 
  achat, 
  onPress,
  activeTheme,
  isDarkMode = false 
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/achat/${achat.idAchat}`);
    }
  };

  // Calculer la progression basée sur le montant
  const progressPercentage = Math.min((achat.totalDepense / 100000) * 100, 100);

  // Couleurs dynamiques selon le thème
  const themeColors = {
    cardBg: isDarkMode ? '#1E293B' : '#FFFFFF',
    dateBadgeBg: isDarkMode ? activeTheme?.primaryDark + '30' : activeTheme?.primary + '10',
    dateBadgeBorder: activeTheme?.primary + '30',
    dateText: activeTheme?.primary || '#0284C7',
    titleText: isDarkMode ? '#F1F5F9' : '#1E293B',
    totalText: activeTheme?.primary || '#0284C7',
    dateInfoText: isDarkMode ? '#94A3B8' : '#64748B',
    pillBg: isDarkMode ? '#0F172A' : '#F1F5F9',
    pillText: isDarkMode ? '#CBD5E1' : '#475569',
    iconColor: activeTheme?.primary || '#0284C7',
    progressBg: isDarkMode ? '#334155' : '#E2E8F0',
    progressFill: activeTheme?.primary || '#0284C7',
  };

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: themeColors.cardBg }]} onPress={handlePress}>
      <View style={styles.cardContent}>
        
        {/* En-tête : Date Badge + Infos */}
        <View style={styles.topRow}>
             <View style={[
               styles.dateBadge,
               { 
                 backgroundColor: themeColors.dateBadgeBg,
                 borderColor: themeColors.dateBadgeBorder 
               }
             ]}>
                <Text style={[styles.dateDay, { color: themeColors.dateText }]}>
                  {format(new Date(achat.dateAchat), 'dd')}
                </Text>
                <Text style={[styles.dateMonth, { color: themeColors.dateText }]}>
                  {format(new Date(achat.dateAchat), 'MMM')}
                </Text>
             </View>
             
             <View style={styles.mainInfo}>
                <View style={styles.titleRow}>
                  <Text style={[styles.cardTitle, { color: themeColors.titleText }]} numberOfLines={1}>
                    {achat.nomListe}
                  </Text>
                  <Text style={[styles.cardTotal, { color: themeColors.totalText }]}>
                    {formatMoney(achat.totalDepense)} Ar
                  </Text>
                </View>

                <View style={styles.subInfoRow}>
                   <Text style={[styles.cardDate, { color: themeColors.dateInfoText }]}>
                     {format(new Date(achat.dateAchat), 'dd MMMM yyyy, HH:mm')}
                   </Text>
                </View>

                <View style={styles.metaRow}>
                   <View style={[styles.pill, { backgroundColor: themeColors.pillBg }]}>
                      <Ionicons name="bag-handle" size={12} color={themeColors.iconColor} />
                      <Text style={[styles.metaText, { color: themeColors.pillText }]}>
                        {achat.nombreArticles} article{achat.nombreArticles > 1 ? 's' : ''}
                      </Text>
                   </View>
                </View>
             </View>
        </View>

        {/* Barre de progression déplacée en bas proprement */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: themeColors.progressBg }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progressPercentage}%`, 
                  backgroundColor: themeColors.progressFill 
                }
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
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 4,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  dateDay: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  dateMonth: {
    fontSize: 10,
    textTransform: 'uppercase',
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
    flex: 1,
    marginRight: 8,
  },
  cardTotal: {
    fontSize: 15,
    fontWeight: '700',
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardDate: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 0,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
