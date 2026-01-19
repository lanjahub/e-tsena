import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
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
  const [rappelDate, setRappelDate] = useState(new Date(Date.now() + 3600000)); // +1h
  const [rappelMessage, setRappelMessage] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Charger les données
  const loadData = useCallback(() => {
    try {
      const data = getRappels();
      setRappels(data);
      
      // Charger les achats pour le modal
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

  // Cliquer sur un rappel - Navigation améliorée
  const handlePress = (item: RappelItem) => {
    marquerCommeLu(item.idRappel);
    setRappels((prev) =>
      prev.map((r) => (r.idRappel === item.idRappel ? { ...r, lu: 1 } : r))
    );
    
    // Navigation vers la liste d'achat avec animation
    if (item.achatId || item.idListeAchat) {
      const listeId = item.achatId || item.idListeAchat;
      console.log(`📱 Navigation vers liste ${listeId}`);
      
      // Utiliser replace pour éviter l'empilement dans la stack
      router.push({
        pathname: `/achat/[id]`,
        params: { id: listeId, fromNotif: 'true' }
      });
    } else {
      Alert.alert(
        'Liste introuvable',
        'Cette liste d\'achat n\'existe plus ou a été supprimée.',
        [{ text: 'OK', onPress: () => loadData() }]
      );
    }
  };

  // Supprimer
  const handleDelete = (item: RappelItem) => {
    Alert.alert(
      'Supprimer le rappel ?',
      `"${item.titre}"\n\nCette action est définitive.`,
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

  // Tout marquer comme lu
  const handleMarkAllRead = () => {
    marquerToutCommeLu();
    setRappels((prev) => prev.map((r) => ({ ...r, lu: 1 })));
  };

  // Créer un rappel
  const handleCreate = () => {
    if (!selectedAchat) {
      Alert.alert('Erreur', 'Veuillez sélectionner une liste');
      return;
    }

    const result = creerRappel(
      selectedAchat.id,
      selectedAchat.nomListe || 'Rappel courses',
      rappelMessage || `N'oubliez pas: ${selectedAchat.nomListe}`,
      rappelDate,
      'rappel'
    );

    if (result) {
      Alert.alert('✅ Succès', 'Rappel créé avec succès!');
      setShowModal(false);
      setSelectedAchat(null);
      setRappelMessage('');
      setRappelDate(new Date(Date.now() + 3600000));
      loadData();
    } else {
      Alert.alert('Erreur', 'Impossible de créer le rappel');
    }
  };

  // Formater la date
  const formatDateDisplay = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    if (dateStr === today) return "Aujourd'hui";
    if (dateStr === tomorrow) return 'Demain';

    try {
      return format(new Date(dateStr), 'EEE dd MMM', { locale: fr });
    } catch {
      return dateStr;
    }
  };

  // Icône selon type
  const getIcon = (type: string, isUrgent?: boolean) => {
    if (isUrgent) return { name: 'alert-circle', color: '#EF4444' };
    switch (type) {
      case 'marche': return { name: 'storefront', color: '#10B981' };
      case 'pharmacie': return { name: 'medical', color: '#EF4444' };
      default: return { name: 'notifications', color: activeTheme.primary };
    }
  };

  const unreadCount = rappels.filter((r) => r.lu === 0).length;

  // Grouper par date
  const todayRappels = rappels.filter((r) => r.isToday);
  const tomorrowRappels = rappels.filter((r) => r.isTomorrow);
  const futureRappels = rappels.filter((r) => !r.isToday && !r.isTomorrow && !r.isPast);
  const pastRappels = rappels.filter((r) => r.isPast);

  // Render item
  const renderItem = ({ item }: { item: RappelItem }) => {
    const icon = getIcon(item.type, item.isUrgent);
    const isUnread = item.lu === 0;

    return (
      <TouchableOpacity
        style={[
          s.card,
          isUnread && s.cardUnread,
          item.isUrgent && s.cardUrgent,
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        {/* Icône */}
        <View style={[s.iconBox, { backgroundColor: icon.color }]}>
          <Ionicons name={icon.name as any} size={22} color="#fff" />
        </View>

        {/* Contenu */}
        <View style={s.cardContent}>
          <Text style={[s.cardTitle, isUnread && s.textBold]} numberOfLines={1}>
            {item.titre || item.nomListe || 'Rappel'}
          </Text>
          <Text style={s.cardMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <View style={s.cardMeta}>
            <Ionicons name="time-outline" size={12} color={s.textSec.color} />
            <Text style={s.cardMetaText}>{item.heureRappel}</Text>
            {item.nombreArticles > 0 && (
              <>
                <Text style={s.cardMetaDot}>•</Text>
                <Ionicons name="cart-outline" size={12} color={s.textSec.color} />
                <Text style={s.cardMetaText}>{item.nombreArticles}</Text>
              </>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={s.cardActions}>
          {isUnread && <View style={[s.dot, { backgroundColor: activeTheme.primary }]} />}
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Section header
  const SectionHeader = ({ title, count }: { title: string; count: number }) => (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={[s.countBadge, { backgroundColor: activeTheme.secondary }]}>
        <Text style={[s.countText, { color: activeTheme.primary }]}>{count}</Text>
      </View>
    </View>
  );

  // Empty
  const EmptyState = () => (
    <View style={s.empty}>
      <View style={[s.emptyIcon, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
        <Ionicons name="notifications-off-outline" size={50} color={s.textSec.color} />
      </View>
      <Text style={s.emptyTitle}>Aucun rappel</Text>
      <Text style={s.emptySubtitle}>Appuyez sur + pour créer un rappel</Text>
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
      {/* Header */}
      <LinearGradient colors={activeTheme.gradient as any} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <Text style={s.headerTitle}>🔔 Rappels</Text>

          {unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={s.headerBtnText}>
              <Text style={s.headerBtnTextLabel}>Tout lire</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 70 }} />
          )}
        </View>
      </LinearGradient>

      {/* Banner */}
      {unreadCount > 0 && (
        <View style={s.banner}>
          <Ionicons name="alarm" size={16} color="#fff" />
          <Text style={s.bannerText}>
            {unreadCount} rappel{unreadCount > 1 ? 's' : ''} en attente
          </Text>
        </View>
      )}

      {/* Liste */}
      <FlatList
        data={[]}
        renderItem={() => null}
        keyExtractor={() => 'header'}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[activeTheme.primary]}
            tintColor={activeTheme.primary}
          />
        }
        ListEmptyComponent={rappels.length === 0 ? EmptyState : null}
        ListHeaderComponent={
          rappels.length > 0 ? (
            <>
              {todayRappels.length > 0 && (
                <>
                  <SectionHeader title="📅 Aujourd'hui" count={todayRappels.length} />
                  {todayRappels.map((item) => (
                    <View key={item.idRappel}>{renderItem({ item })}</View>
                  ))}
                </>
              )}

              {tomorrowRappels.length > 0 && (
                <>
                  <SectionHeader title="📆 Demain" count={tomorrowRappels.length} />
                  {tomorrowRappels.map((item) => (
                    <View key={item.idRappel}>{renderItem({ item })}</View>
                  ))}
                </>
              )}

              {futureRappels.length > 0 && (
                <>
                  <SectionHeader title="📋 À venir" count={futureRappels.length} />
                  {futureRappels.map((item) => (
                    <View key={item.idRappel}>{renderItem({ item })}</View>
                  ))}
                </>
              )}

              {pastRappels.length > 0 && (
                <>
                  <SectionHeader title="⏰ Passés" count={pastRappels.length} />
                  {pastRappels.map((item) => (
                    <View key={item.idRappel}>{renderItem({ item })}</View>
                  ))}
                </>
              )}
            </>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: activeTheme.primary }]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal Création */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modal, { backgroundColor: isDarkMode ? '#1E293B' : '#fff' }]}>
            {/* Header */}
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: s.text.color }]}>🔔 Nouveau rappel</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={s.textSec.color} />
              </TouchableOpacity>
            </View>

            {/* Sélection liste */}
            <Text style={[s.label, { color: s.textSec.color }]}>Choisir une liste</Text>
            <View style={s.achatsGrid}>
              {achats.length === 0 ? (
                <Text style={[s.noData, { color: s.textSec.color }]}>Aucune liste disponible</Text>
              ) : (
                achats.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      s.achatChip,
                      {
                        borderColor: selectedAchat?.id === a.id ? activeTheme.primary : s.border.borderColor,
                        backgroundColor: selectedAchat?.id === a.id ? activeTheme.secondary : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedAchat(a)}
                  >
                    <Ionicons
                      name="cart-outline"
                      size={16}
                      color={selectedAchat?.id === a.id ? activeTheme.primary : s.textSec.color}
                    />
                    <Text
                      style={{
                        color: selectedAchat?.id === a.id ? activeTheme.primary : s.text.color,
                        fontSize: 13,
                        fontWeight: selectedAchat?.id === a.id ? '600' : '400',
                      }}
                      numberOfLines={1}
                    >
                      {a.nomListe || 'Sans nom'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Date & Heure */}
            <Text style={[s.label, { color: s.textSec.color, marginTop: 16 }]}>Date et heure</Text>
            <View style={s.dateRow}>
              <TouchableOpacity
                style={[s.dateBtn, { borderColor: s.border.borderColor }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={18} color={activeTheme.primary} />
                <Text style={[s.dateBtnText, { color: s.text.color }]}>
                  {format(rappelDate, 'dd MMM yyyy', { locale: fr })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.dateBtn, { borderColor: s.border.borderColor }]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time" size={18} color={activeTheme.primary} />
                <Text style={[s.dateBtnText, { color: s.text.color }]}>
                  {format(rappelDate, 'HH:mm')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Message */}
            <Text style={[s.label, { color: s.textSec.color, marginTop: 16 }]}>Message (optionnel)</Text>
            <TextInput
              style={[
                s.input,
                {
                  borderColor: s.border.borderColor,
                  backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC',
                  color: s.text.color,
                },
              ]}
              placeholder="Ex: Acheter du pain"
              placeholderTextColor={s.textSec.color}
              value={rappelMessage}
              onChangeText={setRappelMessage}
              multiline
            />

            {/* Boutons */}
            <View style={s.modalBtns}>
              <TouchableOpacity
                style={[s.btnCancel, { borderColor: s.border.borderColor }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[s.btnCancelText, { color: s.textSec.color }]}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btnConfirm, { backgroundColor: activeTheme.primary }]}
                onPress={handleCreate}
              >
                <Ionicons name="notifications" size={18} color="#fff" />
                <Text style={s.btnConfirmText}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Date Picker */}
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

        {/* Time Picker */}
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
  container: { flex: 1, backgroundColor: c.bg },
  center: { justifyContent: 'center', alignItems: 'center' },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerBtnText: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  headerBtnTextLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Banner
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', paddingVertical: 8, gap: 6 },
  bannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // List
  list: { flexGrow: 1, paddingBottom: 100 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.bg, borderBottomWidth: 1, borderBottomColor: c.border },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: c.text },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: 'bold' },

  // Card
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: c.primary || '#7143b5' },
  cardUrgent: { borderLeftWidth: 4, borderLeftColor: '#EF4444', backgroundColor: '#FEF2F2' },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, color: c.text, marginBottom: 2 },
  textBold: { fontWeight: 'bold' },
  cardMessage: { fontSize: 13, color: c.textSec, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 11, color: c.textSec },
  cardMetaDot: { color: c.textSec, marginHorizontal: 4 },
  cardActions: { alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Empty
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: c.text },
  emptySubtitle: { fontSize: 14, color: c.textSec, marginTop: 4 },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 8 },

  achatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  achatChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, gap: 6, maxWidth: '48%' },
  noData: { fontSize: 13, fontStyle: 'italic', paddingVertical: 20 },

  dateRow: { flexDirection: 'row', gap: 10 },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, gap: 8 },
  dateBtnText: { fontSize: 14, fontWeight: '500' },

  input: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 70, textAlignVertical: 'top' },

  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  btnCancelText: { fontSize: 15, fontWeight: '600' },
  btnConfirm: { flex: 1, flexDirection: 'row', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  text: { color: c.text },
  textSec: { color: c.textSec },
  border: { borderColor: c.border },
});