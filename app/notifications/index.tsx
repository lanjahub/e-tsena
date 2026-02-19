import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';

import { useTheme } from '../../src/context/ThemeContext';
import { getDb } from '../../src/db/init';
import {
  getRappels,
  creerRappel,
  marquerCommeLu,
  marquerToutCommeLu,
  supprimerRappel,
  RappelItem,
} from '../../src/services/notificationService';

const { width, height } = Dimensions.get('window');

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeTheme, getStyles, isDarkMode } = useTheme();
  const s = getStyles(styles);

  const [rappels, setRappels] = useState<RappelItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal création
  const [showModal, setShowModal] = useState(false);
  const [achats, setAchats] = useState<any[]>([]);
  const [selectedAchat, setSelectedAchat] = useState<any>(null);
  const [rappelDate, setRappelDate] = useState(new Date(Date.now() + 3600000));
  const [rappelMessage, setRappelMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (showModal) {
      Animated.parallel([
        Animated.timing(modalAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      modalAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
  }, [showModal]);

  // Charger les données
  const loadData = useCallback(() => {
    try {
      const data = getRappels();
      setRappels(data);
      
      const db = getDb();
      const achatsList = db.getAllSync(`
        SELECT idListe as id, nomListe FROM ListeAchat 
        WHERE statut = 0 OR statut IS NULL
        ORDER BY dateAchat DESC LIMIT 10
      `);
      setAchats(achatsList as any[]);
    } catch (e) {
      console.error('Erreur:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handlePress = (item: RappelItem) => {
    marquerCommeLu(item.idRappel);
    setRappels((prev) =>
      prev.map((r) => (r.idRappel === item.idRappel ? { ...r, lu: 1 } : r))
    );
    
    if (item.achatId || item.idListeAchat) {
      const listeId = item.achatId || item.idListeAchat;
      router.push({
        pathname: `/achat/[id]`,
        params: { id: listeId, fromNotif: 'true' }
      });
    }
  };

  const handleDelete = (item: RappelItem) => {
    Alert.alert(
      'Supprimer ce rappel ?',
      item.titre,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            supprimerRappel(item.idRappel);
            setRappels((prev) => prev.filter((r) => r.idRappel !== item.idRappel));
          },
        },
      ]
    );
  };

  const handleMarkAllRead = () => {
    marquerToutCommeLu();
    setRappels((prev) => prev.map((r) => ({ ...r, lu: 1 })));
  };

  const handleCreate = async () => {
    if (!selectedAchat) {
      Alert.alert('Sélection requise', 'Choisissez une liste d\'achat');
      return;
    }

    if (rappelDate <= new Date()) {
      Alert.alert('Date invalide', 'Choisissez une date future');
      return;
    }

    try {
      const result = await creerRappel(
        selectedAchat.id,
        selectedAchat.nomListe || 'Rappel',
        rappelMessage || `Rappel: ${selectedAchat.nomListe}`,
        rappelDate,
        'rappel'
      );

      if (result) {
        setShowModal(false);
        setSelectedAchat(null);
        setRappelMessage('');
        setRappelDate(new Date(Date.now() + 3600000));
        loadData();
        
        Alert.alert(
          '✅ Rappel créé',
          `${format(rappelDate, 'EEEE dd MMMM à HH:mm', { locale: fr })}`
        );
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le rappel');
    }
  };

  const unreadCount = rappels.filter((r) => r.lu === 0).length;

  // Grouper par période
  const todayRappels = rappels.filter((r) => r.isToday);
  const tomorrowRappels = rappels.filter((r) => r.isTomorrow);
  const futureRappels = rappels.filter((r) => !r.isToday && !r.isTomorrow && !r.isPast);
  const pastRappels = rappels.filter((r) => r.isPast);

  // Render Card amélioré
  const RappelCard = ({ item, index }: { item: RappelItem; index: number }) => {
    const isUnread = item.lu === 0;
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        delay: index * 50,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          ],
        }}
      >
        <TouchableOpacity
          style={[
            s.card,
            isUnread && s.cardUnread,
            item.isUrgent && s.cardUrgent,
          ]}
          onPress={() => handlePress(item)}
          activeOpacity={0.8}
        >
          {/* Indicateur non lu */}
          {isUnread && (
            <View style={[s.unreadIndicator, { backgroundColor: activeTheme.primary }]} />
          )}

          {/* Icône */}
          <View style={s.cardIcon}>
            <LinearGradient
              colors={item.isPast 
                ? ['#94A3B8', '#64748B']
                : item.isUrgent 
                  ? ['#EF4444', '#DC2626'] 
                  : [activeTheme.primary, activeTheme.primaryDark || activeTheme.primary]
              }
              style={s.iconGradient}
            >
              <Ionicons 
                name={item.isPast ? 'time' : 'notifications'} 
                size={22} 
                color="#fff" 
              />
            </LinearGradient>
          </View>

          {/* Contenu */}
          <View style={s.cardBody}>
            <Text style={[s.cardTitle, isUnread && s.cardTitleBold]} numberOfLines={1}>
              {item.titre || item.nomListe || 'Rappel'}
            </Text>
            
            {item.message && (
              <Text style={s.cardDesc} numberOfLines={2}>
                {item.message}
              </Text>
            )}

            {/* Infos */}
            <View style={s.cardMeta}>
              <View style={[s.metaItem, { backgroundColor: activeTheme.primary + '12' }]}>
                <Ionicons name="calendar-outline" size={12} color={activeTheme.primary} />
                <Text style={[s.metaText, { color: activeTheme.primary }]}>
                  {item.dateRappel}
                </Text>
              </View>
              
              <View style={[s.metaItem, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                <Ionicons name="time-outline" size={12} color={s.textSec.color} />
                <Text style={[s.metaText, { color: s.textSec.color }]}>
                  {item.heureRappel}
                </Text>
              </View>

              {item.nombreArticles > 0 && (
                <View style={[s.metaItem, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                  <Ionicons name="bag-outline" size={12} color={s.textSec.color} />
                  <Text style={[s.metaText, { color: s.textSec.color }]}>
                    {item.nombreArticles}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Bouton supprimer */}
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={s.deleteBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Section Header
  const SectionHeader = ({ icon, title, count, color }: { 
    icon: string; 
    title: string; 
    count: number;
    color?: string;
  }) => (
    <View style={s.sectionHeader}>
      <View style={s.sectionLeft}>
        <View style={[s.sectionIcon, { backgroundColor: (color || activeTheme.primary) + '15' }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <View style={[s.sectionBadge, { backgroundColor: (color || activeTheme.primary) + '15' }]}>
        <Text style={[s.sectionCount, { color: color || activeTheme.primary }]}>{count}</Text>
      </View>
    </View>
  );

  // Empty State
  const EmptyState = () => (
    <View style={s.empty}>
      <View style={s.emptyIconWrap}>
        <LinearGradient
          colors={[activeTheme.primary + '20', activeTheme.primary + '05']}
          style={s.emptyIconBg}
        >
          <Ionicons name="notifications-off-outline" size={56} color={activeTheme.primary} />
        </LinearGradient>
      </View>
      <Text style={s.emptyTitle}>Aucun rappel</Text>
      <Text style={s.emptyDesc}>
        Créez un rappel pour ne jamais oublier{'\n'}vos courses importantes
      </Text>
      <TouchableOpacity
        style={[s.emptyBtn, { backgroundColor: activeTheme.primary }]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={s.emptyBtnText}>Créer un rappel</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" color={activeTheme.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Header moderne */}
      <LinearGradient 
        colors={activeTheme.gradient as any} 
        style={[s.header, { paddingTop: insets.top }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.headerContent}>
          <View style={s.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Rappels</Text>
            </View>

            {unreadCount > 0 ? (
              <TouchableOpacity onPress={handleMarkAllRead} style={s.markReadBtn}>
                <Ionicons name="checkmark-done" size={18} color="#fff" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          {/* Stats */}
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <View style={[s.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="notifications" size={16} color="#fff" />
              </View>
              <View>
                <Text style={s.statValue}>{rappels.length}</Text>
                <Text style={s.statLabel}>Total</Text>
              </View>
            </View>

            <View style={s.statDivider} />

            <View style={s.statItem}>
              <View style={[
                s.statIcon, 
                { backgroundColor: unreadCount > 0 ? '#FBBF24' : 'rgba(255,255,255,0.2)' }
              ]}>
                <Ionicons name="alert-circle" size={16} color={unreadCount > 0 ? '#92400E' : '#fff'} />
              </View>
              <View>
                <Text style={s.statValue}>{unreadCount}</Text>
                <Text style={s.statLabel}>Non lus</Text>
              </View>
            </View>

            <View style={s.statDivider} />

            <View style={s.statItem}>
              <View style={[s.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="today" size={16} color="#fff" />
              </View>
              <View>
                <Text style={s.statValue}>{todayRappels.length}</Text>
                <Text style={s.statLabel}>Aujourd'hui</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Liste */}
      <Animated.View 
        style={[
          s.listContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[activeTheme.primary]}
              tintColor={activeTheme.primary}
              progressViewOffset={10}
            />
          }
        >
          {rappels.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {todayRappels.length > 0 && (
                <View style={s.section}>
                  <SectionHeader icon="🔔" title="Aujourd'hui" count={todayRappels.length} color="#EF4444" />
                  {todayRappels.map((item, index) => (
                    <RappelCard key={item.idRappel} item={item} index={index} />
                  ))}
                </View>
              )}

              {tomorrowRappels.length > 0 && (
                <View style={s.section}>
                  <SectionHeader icon="📅" title="Demain" count={tomorrowRappels.length} color="#F59E0B" />
                  {tomorrowRappels.map((item, index) => (
                    <RappelCard key={item.idRappel} item={item} index={index} />
                  ))}
                </View>
              )}

              {futureRappels.length > 0 && (
                <View style={s.section}>
                  <SectionHeader icon="📆" title="À venir" count={futureRappels.length} color="#3B82F6" />
                  {futureRappels.map((item, index) => (
                    <RappelCard key={item.idRappel} item={item} index={index} />
                  ))}
                </View>
              )}

              {pastRappels.length > 0 && (
                <View style={s.section}>
                  <SectionHeader icon="⏰" title="Passés" count={pastRappels.length} color="#94A3B8" />
                  {pastRappels.map((item, index) => (
                    <RappelCard key={item.idRappel} item={item} index={index} />
                  ))}
                </View>
              )}
            </>
          )}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* FAB moderne */}
      <TouchableOpacity
        style={s.fabContainer}
        onPress={() => setShowModal(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[activeTheme.primary, activeTheme.primaryDark || activeTheme.primary]}
          style={s.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modal de création moderne */}
      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowModal(false)}
      >
        <Animated.View 
          style={[
            s.modalOverlay,
            { opacity: modalAnim }
          ]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            onPress={() => setShowModal(false)}
            activeOpacity={1}
          />
          
          <Animated.View 
            style={[
              s.modalContainer,
              {
                transform: [
                  { scale: scaleAnim },
                  { 
                    translateY: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <View style={[s.modal, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
              {/* Handle */}
              <View style={s.modalHandle} />
              
              {/* Header */}
              <View style={s.modalHeader}>
                <View style={[s.modalIconWrap, { backgroundColor: activeTheme.primary + '15' }]}>
                  <Ionicons name="notifications" size={24} color={activeTheme.primary} />
                </View>
                <View style={s.modalTitleWrap}>
                  <Text style={s.modalTitle}>Nouveau rappel</Text>
                  <Text style={s.modalSubtitle}>Ne ratez plus vos courses</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowModal(false)}
                  style={s.closeBtn}
                >
                  <Ionicons name="close" size={22} color={s.textSec.color} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                style={s.modalScroll}
                bounces={false}
              >
                {/* Sélection de liste */}
                <View style={s.formSection}>
                  <View style={s.formLabel}>
                    <Ionicons name="basket-outline" size={16} color={activeTheme.primary} />
                    <Text style={s.formLabelText}>Liste d'achat</Text>
                  </View>

                  {achats.length === 0 ? (
                    <View style={s.noListWrap}>
                      <Ionicons name="basket-outline" size={40} color={s.textSec.color} />
                      <Text style={[s.noListText, { color: s.textSec.color }]}>
                        Aucune liste disponible
                      </Text>
                    </View>
                  ) : (
                    <View style={s.listGrid}>
                      {achats.map((a) => {
                        const isSelected = selectedAchat?.id === a.id;
                        return (
                          <TouchableOpacity
                            key={a.id}
                            style={[
                              s.listItem,
                              { 
                                backgroundColor: isSelected 
                                  ? activeTheme.primary + '15'
                                  : isDarkMode ? '#374151' : '#F9FAFB',
                                borderColor: isSelected 
                                  ? activeTheme.primary 
                                  : 'transparent',
                              }
                            ]}
                            onPress={() => setSelectedAchat(a)}
                          >
                            {isSelected && (
                              <View style={[s.checkCircle, { backgroundColor: activeTheme.primary }]}>
                                <Ionicons name="checkmark" size={12} color="#fff" />
                              </View>
                            )}
                            <Text 
                              style={[
                                s.listItemText,
                                { 
                                  color: isSelected ? activeTheme.primary : s.text.color,
                                  fontWeight: isSelected ? '600' : '500',
                                }
                              ]}
                              numberOfLines={1}
                            >
                              {a.nomListe || 'Sans nom'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Date et Heure */}
                <View style={s.formSection}>
                  <View style={s.formLabel}>
                    <Ionicons name="time-outline" size={16} color={activeTheme.primary} />
                    <Text style={s.formLabelText}>Date et heure</Text>
                  </View>

                  <View style={s.dateTimeRow}>
                    <TouchableOpacity
                      style={[
                        s.dateTimeBtn,
                        { 
                          backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                          borderColor: activeTheme.primary + '30',
                        }
                      ]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <View style={[s.dateTimeIcon, { backgroundColor: activeTheme.primary }]}>
                        <Ionicons name="calendar" size={16} color="#fff" />
                      </View>
                      <View style={s.dateTimeContent}>
                        <Text style={[s.dateTimeLabel, { color: s.textSec.color }]}>Date</Text>
                        <Text style={[s.dateTimeValue, { color: s.text.color }]}>
                          {format(rappelDate, 'EEE dd MMM', { locale: fr })}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        s.dateTimeBtn,
                        { 
                          backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                          borderColor: activeTheme.primary + '30',
                        }
                      ]}
                      onPress={() => setShowTimePicker(true)}
                    >
                      <View style={[s.dateTimeIcon, { backgroundColor: '#F59E0B' }]}>
                        <Ionicons name="time" size={16} color="#fff" />
                      </View>
                      <View style={s.dateTimeContent}>
                        <Text style={[s.dateTimeLabel, { color: s.textSec.color }]}>Heure</Text>
                        <Text style={[s.dateTimeValue, { color: s.text.color }]}>
                          {format(rappelDate, 'HH:mm')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Message optionnel */}
                <View style={s.formSection}>
                  <View style={s.formLabel}>
                    <Ionicons name="chatbubble-outline" size={16} color={activeTheme.primary} />
                    <Text style={s.formLabelText}>Note (optionnel)</Text>
                  </View>

                  <TextInput
                    style={[
                      s.textInput,
                      {
                        backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                        color: s.text.color,
                        borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                      }
                    ]}
                    placeholder="Ex: Ne pas oublier le pain..."
                    placeholderTextColor={s.textSec.color}
                    value={rappelMessage}
                    onChangeText={setRappelMessage}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.cancelBtn, { borderColor: isDarkMode ? '#4B5563' : '#E5E7EB' }]}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={[s.cancelBtnText, { color: s.textSec.color }]}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.confirmBtn,
                    { 
                      backgroundColor: selectedAchat ? activeTheme.primary : '#D1D5DB',
                    }
                  ]}
                  onPress={handleCreate}
                  disabled={!selectedAchat}
                >
                  <Ionicons name="notifications" size={18} color="#fff" />
                  <Text style={s.confirmBtnText}>Créer le rappel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={rappelDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(e, date) => {
              setShowDatePicker(false);
              if (date) setRappelDate(date);
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={rappelDate}
            mode="time"
            display="default"
            onChange={(e, date) => {
              setShowTimePicker(false);
              if (date) {
                const newDate = new Date(rappelDate);
                newDate.setHours(date.getHours(), date.getMinutes());
                setRappelDate(newDate);
              }
            }}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: c.bg,
  },
  center: { 
    justifyContent: 'center', 
    alignItems: 'center',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    gap: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  markReadBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // List
  listContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },

  // Section
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: c.text,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  cardUnread: {
    borderWidth: 0,
  },
  cardUrgent: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  unreadIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  cardIcon: {
    marginRight: 14,
  },
  iconGradient: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    paddingTop: 2,
  },
  cardTitle: {
    fontSize: 15,
    color: c.text,
    marginBottom: 4,
  },
  cardTitleBold: {
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    color: c.textSec,
    lineHeight: 18,
    marginBottom: 10,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    marginBottom: 24,
  },
  emptyIconBg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: c.textSec,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: height * 0.85,
  },
  modal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleWrap: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: c.textSec,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: height * 0.55,
  },

  // Form
  formSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  formLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.text,
  },
  noListWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  noListText: {
    fontSize: 14,
  },
  listGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: '47%',
    gap: 8,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemText: {
    fontSize: 14,
    flex: 1,
  },

  // Date Time
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  dateTimeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeContent: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Text Input
  textInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  // Helpers
  text: { color: c.text },
  textSec: { color: c.textSec },
  border: { borderColor: c.border },
});