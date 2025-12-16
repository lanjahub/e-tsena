import { useEffect, useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert, Dimensions
} from 'react-native';
import { ThemedStatusBar } from '../../../src/components/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import formatMoney from '../../../src/utils/formatMoney';
import { fr, enUS } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

import { getDb } from '../../../src/db/init'; 
import { useTheme } from '../../../src/context/ThemeContext'; 
import { useSettings } from '../../../src/context/SettingsContext';
import { registerForPushNotificationsAsync, scheduleShoppingReminder } from '../../../src/services/notificationService';
import { ConfirmModal } from '../../../src/components/ConfirmModal';

interface Achat {
  id: number;
  nomListe: string;
  dateAchat: string;
}

export default function AchatDetails() {
  const { activeTheme, getStyles, isDarkMode } = useTheme();
  const { currency, language, t } = useSettings();
  const insets = useSafeAreaInsets();
  const s = getStyles(styles);
  
  const params = useLocalSearchParams<{ id?: string, readOnly?: string }>();
  const achatId = Number(params.id);
  const isReadOnly = params.readOnly === '1';

  const scrollViewRef = useRef<ScrollView>(null);

  const [achat, setAchat] = useState<Achat | null>(null);
  const [lignes, setLignes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [newItem, setNewItem] = useState('');
  
  const [editModal, setEditModal] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [editData, setEditData] = useState({ nom: '', qty: '', prix: '', unite: 'pcs' });
  
  const [quickModal, setQuickModal] = useState(false);
  const [quickIdx, setQuickIdx] = useState(-1);
  const [quickData, setQuickData] = useState({ nom: '', qty: '1', prix: '', unite: 'pcs' });

  const [deleteModal, setDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  
  const [editNameIdx, setEditNameIdx] = useState(-1);
  const [editNameValue, setEditNameValue] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reminderDate, setReminderDate] = useState(new Date());
  const [mode, setMode] = useState<'date' | 'time'>('date');

  useEffect(() => {
    if (!achatId) return;
    loadData();
    if (!isReadOnly) {
        registerForPushNotificationsAsync();
    }
  }, [achatId]);

  const loadData = () => {
    try {
      const db = getDb();
      const result = db.getAllSync('SELECT * FROM Achat WHERE id = ?', [achatId]);
      const a = result[0] as Achat;
      if (!a) return;
      setAchat(a);
      setTitle(a.nomListe);
      const items = db.getAllSync('SELECT * FROM LigneAchat WHERE idAchat = ? ORDER BY id ASC', [achatId]);
      setLignes(items.map((l: any) => ({ ...l, checked: l.quantite > 0 && l.prixUnitaire > 0 })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const saveTitle = () => {
    if (isReadOnly) return;
    if (!title.trim() || !achat) return;
    getDb().runSync('UPDATE Achat SET nomListe = ? WHERE id = ?', [title, achatId]);
    setAchat({ ...achat, nomListe: title });
  };

  const addItem = () => {
    if (isReadOnly) return;
    const nom = newItem.trim();
    if (!nom) return;
    try {
        const db = getDb();
        const r = db.runSync('INSERT INTO LigneAchat (idAchat, libelleProduit, quantite, prixUnitaire, prixTotal, unite) VALUES (?, ?, 0, 0, 0, "pcs")', [achatId, nom]);
        const newLine = { id: r.lastInsertRowId, libelleProduit: nom, quantite: 0, prixUnitaire: 0, prixTotal: 0, unite: 'pcs', checked: false };
        setLignes(prev => [...prev, newLine]);
        setNewItem('');
        setTimeout(() => { scrollViewRef.current?.scrollToEnd({ animated: true }); }, 100);
    } catch(e) { console.error(e); }
  };

  const toggle = (item: any) => {
    if (isReadOnly) return;
    const idx = lignes.findIndex(l => l.id === item.id);
    const l = lignes[idx];
    if (l.checked) {
      lignes[idx] = { ...l, quantite: 0, prixUnitaire: 0, prixTotal: 0, checked: false };
      setLignes([...lignes]);
      if (l.id) getDb().runSync('UPDATE LigneAchat SET quantite=0, prixUnitaire=0, prixTotal=0 WHERE id=?', [l.id]);
    } else {
      setQuickIdx(idx);
      setQuickData({ nom: l.libelleProduit, qty: '1', prix: '', unite: l.unite || 'pcs' });
      setQuickModal(true);
    }
  };

  const saveQuick = () => {
    const qty = Number.parseFloat(quickData.qty) || 0;
    const prix = Number.parseFloat(quickData.prix) || 0;
    const nom = quickData.nom ? quickData.nom.trim() : lignes[quickIdx].libelleProduit;
    const total = qty * prix;
    const l = lignes[quickIdx];
    if (l.id) getDb().runSync('UPDATE LigneAchat SET libelleProduit=?, quantite=?, prixUnitaire=?, prixTotal=?, unite=? WHERE id=?', [nom, qty, prix, total, quickData.unite, l.id]);
    lignes[quickIdx] = { ...l, libelleProduit: nom, quantite: qty, prixUnitaire: prix, prixTotal: total, unite: quickData.unite, checked: true };
    setLignes([...lignes]);
    setQuickModal(false);
  };

  const askDelete = (item: any) => {
    if (isReadOnly) return;
    setItemToDelete(item);
    setDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    getDb().runSync('DELETE FROM LigneAchat WHERE id=?', [itemToDelete.id]);
    const newLignes = lignes.filter(l => l.id !== itemToDelete.id);
    setLignes(newLignes);
    setDeleteModal(false);
    setItemToDelete(null);
    if(newLignes.length === 0 && !isReadOnly) { router.back(); }
  };

  const saveRename = () => {
     if (isReadOnly) return;
     const nom = editNameValue.trim();
     if(nom && editNameIdx !== -1) {
        const l = lignes[editNameIdx];
        getDb().runSync('UPDATE LigneAchat SET libelleProduit = ? WHERE id = ?', [nom, l.id]);
        lignes[editNameIdx].libelleProduit = nom;
        setLignes([...lignes]);
        setEditNameIdx(-1);
     }
  };

  const saveEdit = () => {
    const qty = Number.parseFloat(editData.qty) || 0;
    const prix = Number.parseFloat(editData.prix) || 0;
    const nom = editData.nom.trim();
    const total = qty * prix;
    const l = lignes[editIdx];
    getDb().runSync('UPDATE LigneAchat SET libelleProduit=?, quantite=?, prixUnitaire=?, prixTotal=?, unite=? WHERE id=?', [nom, qty, prix, total, editData.unite, l.id]);
    lignes[editIdx] = { ...l, libelleProduit: nom, quantite: qty, prixUnitaire: prix, prixTotal: total, unite: editData.unite, checked: true };
    setLignes([...lignes]);
    setEditModal(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        if (mode === 'date') {
          const newDate = new Date(reminderDate);
          newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
          setReminderDate(newDate);
          setTimeout(() => {
            setMode('time');
            setShowDatePicker(true);
          }, 100);
        } else {
          const newDate = new Date(reminderDate);
          newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes());
          setReminderDate(newDate);
          scheduleReminder(newDate);
          setMode('date');
        }
      } else {
        setMode('date');
      }
    } else if (selectedDate) {
      setReminderDate(selectedDate);
    }
  };

  const scheduleReminder = async (date: Date) => {
      if (!achat) return;
      const id = await scheduleShoppingReminder(achat!.nomListe, date, achatId);
      if (id) {
          Alert.alert(t('reminder_scheduled'), `${t('reminder_notif_text')} ${format(date, 'dd/MM à HH:mm')}`);
      } else {
          Alert.alert(t('error'), t('reminder_error'));
      }
  };

  const unchecked = lignes.filter(l => !l.checked);
  const checked = lignes.filter(l => l.checked);
  const totalDepense = lignes.reduce((sum, l) => sum + (l.prixTotal || 0), 0);
  const progress = lignes.length > 0 ? checked.length / lignes.length : 0;

  if (loading) return <ActivityIndicator style={s.center} color={activeTheme.primary} />;
  if (!achat) return null;

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      
      <LinearGradient colors={activeTheme.gradient as any} style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.push('/')} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, opacity: 0.9 }}>
          <Ionicons name="home-outline" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginLeft: 4 }}>{t('home')}</Text>
          <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.8)" style={{ marginHorizontal: 3 }} />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>{isReadOnly ? 'Historique' : t('my_list')}</Text>
        </TouchableOpacity>
        
        <View style={s.headerContent}>
           <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
           </TouchableOpacity>
           <View style={{ flex: 1, marginHorizontal: 10 }}>
               {isReadOnly ? (
                  <View>
                      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff' }}>{title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.8)" />
                          <Text style={s.headerDate}> {format(new Date(achat.dateAchat), 'dd MMM yyyy', {locale: language === 'en' ? enUS : fr})}</Text>
                          <View style={s.archivedTag}>
                              <Text style={s.archivedText}>VITA</Text>
                          </View>
                      </View>
                  </View>
               ) : (
                  <View>
                    <TextInput style={s.titleInputSimple} value={title} onChangeText={setTitle} onBlur={saveTitle} placeholder={t('list_title_placeholder')} placeholderTextColor="rgba(255,255,255,0.6)" returnKeyType="done" onSubmitEditing={saveTitle} />
                    <Text style={s.headerDate}>{format(new Date(achat.dateAchat), 'dd MMMM yyyy', {locale: language === 'en' ? enUS : fr})}</Text>
                  </View>
               )}
           </View>
           
           {!isReadOnly && (
               <TouchableOpacity onPress={() => { setMode('date'); setShowDatePicker(true); }} style={[s.backBtn, { marginRight: 8 }]}>
                  <Ionicons name="notifications-outline" size={22} color="#fff" />
               </TouchableOpacity>
           )}

           <TouchableOpacity onPress={() => router.push('/rapports')} style={s.backBtn}>
              <Ionicons name="pie-chart-outline" size={22} color="#fff" />
           </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={{flex: 1, marginTop: -20, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: s.container.backgroundColor, overflow: 'hidden'}}>
        
        {isReadOnly ? (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
             <View style={[s.ticketCard, { shadowColor: activeTheme.primary }]}>
                <View style={s.ticketHeader}>
                    <View style={[s.iconBox, { backgroundColor: activeTheme.secondary }]}>
                       <Ionicons name="receipt" size={24} color={activeTheme.primary} />
                    </View>
                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                       <Text style={{ fontSize: 18, fontWeight: 'bold', color: s.text.color }}>RESUME D'ACHAT</Text>
                       <Text style={{ fontSize: 12, color: s.textSec.color }}>{lignes.length} articles</Text>
                    </View>
                </View>

                <View style={[s.dashedLine, { borderColor: s.border.borderColor }]} />

                <View style={{ gap: 12, marginVertical: 10 }}>
                   {lignes.map((item, index) => (
                      <View key={index} style={s.ticketRow}>
                          <View style={{ flex: 1 }}>
                             <Text style={s.ticketItemName}>{item.libelleProduit}</Text>
                             <Text style={s.ticketItemSub}>{item.quantite} {item.unite} x {formatMoney(item.prixUnitaire)}</Text>
                          </View>
                          <Text style={s.ticketItemPrice}>{formatMoney(item.prixTotal)} {currency}</Text>
                      </View>
                   ))}
                </View>

                <View style={[s.dashedLine, { borderColor: s.border.borderColor }]} />

                <View style={s.ticketTotalRow}>
                    <Text style={s.ticketTotalLabel}>TOTAL PAYÉ</Text>
                    <Text style={[s.ticketTotalValue, { color: activeTheme.primary }]}>{formatMoney(totalDepense)} {currency}</Text>
                </View>
                
                <View style={{ alignItems: 'center', marginTop: 20, opacity: 0.5 }}>
                   <Ionicons name="barcode-outline" size={40} color={s.text.color} />
                   <Text style={{ fontSize: 10, color: s.text.color, marginTop: 5 }}>E-TSENA APP</Text>
                </View>
             </View>
          </ScrollView>
        ) : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            
            <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
                <View style={s.summaryCard}>
                    <View style={s.summaryRow}>
                        <View>
                            <Text style={s.summaryLabel}>{t('total_spent')}</Text>
                            <Text style={[s.summaryValue, { color: activeTheme.primary }]}>{formatMoney(totalDepense)} {currency}</Text>
                        </View>
                        <View style={[s.iconBox, { backgroundColor: activeTheme.secondary }]}>
                            <Ionicons name="wallet-outline" size={24} color={activeTheme.primary} />
                        </View>
                    </View>
                    <View style={s.progressContainer}>
                        <View style={s.progressTextRow}>
                            <Text style={s.progressText}>{t('progress')}</Text>
                            <Text style={s.progressText}>{checked.length}/{lignes.length}</Text>
                        </View>
                        <View style={s.progressBarBg}>
                            <LinearGradient colors={activeTheme.gradient as any} style={[s.progressBarFill, { width: `${progress * 100}%` }]} />
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView ref={scrollViewRef} contentContainerStyle={[s.scrollContent, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={s.section}>
                  <Text style={s.sectionTitle}>{t('to_buy')} ({unchecked.length})</Text>
                  {unchecked.map((item) => {
                      const idx = lignes.indexOf(item);
                      return (
                          <View key={item.id} style={s.todoItem}>
                              <TouchableOpacity onPress={() => toggle(item)} style={[s.checkBox, { borderColor: activeTheme.primary }]} />
                              {editNameIdx === idx ? (
                                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                      <TextInput style={[s.inlineInput, { borderBottomColor: activeTheme.primary, color: s.text.color }]} value={editNameValue} onChangeText={setEditNameValue} autoFocus onSubmitEditing={saveRename} />
                                      <Ionicons name="checkmark" size={20} color={activeTheme.primary} onPress={saveRename} />
                                  </View>
                              ) : (
                                  <TouchableOpacity style={{ flex: 1 }} onPress={() => { setEditNameIdx(idx); setEditNameValue(item.libelleProduit); }}>
                                      <Text style={s.itemText}>{item.libelleProduit}</Text>
                                  </TouchableOpacity>
                              )}
                              <TouchableOpacity onPress={() => askDelete(item)} style={s.miniDeleteBtn}>
                                  <Ionicons name="close" size={16} color="#fff" />
                              </TouchableOpacity>
                          </View>
                      );
                  })}
                  <View style={[s.addItemRow, { borderColor: activeTheme.primary }]}>
                      <Ionicons name="add" size={24} color={activeTheme.primary} />
                      <TextInput style={s.addItemInput} placeholder={t('add_product_placeholder')} placeholderTextColor={s.textSec.color} value={newItem} onChangeText={setNewItem} onSubmitEditing={addItem} />
                  </View>
              </View>

              {checked.length > 0 && (
                  <View style={s.section}>
                      <Text style={s.sectionTitle}>{t('already_bought')} ({checked.length})</Text>
                      {checked.map((item) => {
                          const idx = lignes.indexOf(item);
                          return (
                              <View key={item.id} style={s.doneItem}>
                                  <View style={s.doneHeader}>
                                      <TouchableOpacity onPress={() => toggle(item)}>
                                          <Ionicons name="checkmark-circle" size={22} color={s.success.color} />
                                      </TouchableOpacity>
                                      <Text style={s.doneText} numberOfLines={1}>{item.libelleProduit}</Text>
                                      <Text style={[s.doneTotal, { color: activeTheme.primary }]}>{formatMoney(item.prixTotal)} {currency}</Text>
                                  </View>
                                  <View style={s.doneFooter}>
                                      <Text style={s.doneSub}>{item.quantite} {item.unite} x {formatMoney(item.prixUnitaire)}</Text>
                                      <View style={{ flexDirection: 'row', gap: 8 }}>
                                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: activeTheme.primary + '15' }]} onPress={() => { setEditIdx(idx); setEditData({ nom: item.libelleProduit, qty: item.quantite.toString(), prix: item.prixUnitaire.toString(), unite: item.unite || 'pcs' }); setEditModal(true); }}>
                                              <Ionicons name="create-outline" size={16} color={activeTheme.primary} />
                                          </TouchableOpacity>
                                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: activeTheme.dangerLight }]} onPress={() => askDelete(item)}>
                                              <Ionicons name="trash-outline" size={16} color={s.danger.color} />
                                          </TouchableOpacity>
                                      </View>
                                  </View>
                              </View>
                          );
                      })}
                  </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>

      <ConfirmModal visible={deleteModal} title={t('delete_item_title')} message="Supprimer cet article ?" onConfirm={confirmDelete} onCancel={() => setDeleteModal(false)} confirmText={t('delete')} cancelText={t('cancel')} type="danger" theme={activeTheme} isDarkMode={isDarkMode} />
      
      {showDatePicker && (
        <DateTimePicker value={reminderDate} mode={Platform.OS === 'ios' ? 'datetime' : mode} display="default" onChange={onDateChange} minimumDate={new Date()} />
      )}
      
      <Modal visible={editModal} transparent animationType="fade">
         <View style={s.backdrop}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.modalContainer}>
               <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>{t('edit_item_title')}</Text>
                  <TouchableOpacity onPress={() => setEditModal(false)} style={{ padding: 5 }}>
                     <Ionicons name="close" size={24} color={s.textSec.color} />
                  </TouchableOpacity>
               </View>
               <Text style={s.label}>{t('product_name')}</Text>
               <TextInput style={s.inputBox} value={editData.nom} onChangeText={t => setEditData({...editData, nom: t})} placeholderTextColor={s.textSec.color} />
               <View style={s.row}>
                   <View style={{ flex: 1.5 }}>
                       <Text style={s.label}>{t('quantity')}</Text>
                       <TextInput style={s.inputBox} value={editData.qty} onChangeText={t => setEditData({...editData, qty: t})} keyboardType="numeric" placeholderTextColor={s.textSec.color} />
                   </View>
                   <View style={{ flex: 1 }}>
                       <Text style={s.label}>{t('unit')}</Text>
                       <TextInput style={[s.inputBox, { backgroundColor: s.input.backgroundColor }]} value={editData.unite} onChangeText={t => setEditData({...editData, unite: t})} placeholder="pcs" placeholderTextColor={s.textSec.color} />
                   </View>
               </View>
               <Text style={s.label}>{t('unit_price')} ({currency})</Text>
               <TextInput style={s.inputBox} value={editData.prix} onChangeText={t => setEditData({...editData, prix: t})} keyboardType="numeric" placeholderTextColor={s.textSec.color} />
               <TouchableOpacity onPress={saveEdit} activeOpacity={0.8} style={{ backgroundColor: activeTheme.primary, marginTop: 25, width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, shadowColor: activeTheme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 }}>Enregistrer</Text>
               </TouchableOpacity>
            </KeyboardAvoidingView>
         </View>
      </Modal>

      <Modal visible={quickModal} transparent animationType="fade">
         <View style={s.backdrop}>
            <View style={s.modalContainer}>
               <Text style={s.modalTitle}>{t('how_much')}</Text>
               <Text style={s.label}>{t('product_name')}</Text>
               <View style={[s.inputBox, { justifyContent: 'center', opacity: 0.7 }]}>
                   <Text style={{ fontSize: 16, color: s.text.color, fontWeight: '600' }}>{quickData.nom}</Text>
               </View>
               <View style={s.row}>
                   <View style={s.halfInput}>
                       <Text style={s.label}>{t('quantity')}</Text>
                       <TextInput style={s.inputBox} value={quickData.qty} onChangeText={t => setQuickData({...quickData, qty: t})} keyboardType="numeric" autoFocus placeholderTextColor={s.textSec.color} />
                   </View>
                   <View style={s.halfInput}>
                       <Text style={s.label}>{t('unit')}</Text>
                       <TextInput style={s.inputBox} value={quickData.unite} onChangeText={t => setQuickData({...quickData, unite: t})} placeholderTextColor={s.textSec.color} />
                   </View>
               </View>
               <Text style={s.label}>{t('unit_price_short')} ({currency})</Text>
               <TextInput style={s.inputBox} value={quickData.prix} onChangeText={t => setQuickData({...quickData, prix: t})} keyboardType="numeric" placeholderTextColor={s.textSec.color} />
               <View style={s.modalActions}>
                   <TouchableOpacity onPress={() => setQuickModal(false)} style={s.btnGhost}><Text style={{color: s.textSec.color}}>{t('cancel')}</Text></TouchableOpacity>
                   <TouchableOpacity onPress={saveQuick} style={[s.btnPrimary, { backgroundColor: activeTheme.primary }]}><Text style={{color:'#fff'}}>{t('validate')}</Text></TouchableOpacity>
               </View>
            </View>
         </View>
      </Modal>
    </View>
  );
}

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingBottom: 50, paddingHorizontal: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  titleInputSimple: { fontSize: 20, fontWeight: 'bold', color: '#fff', paddingVertical: 2 },
  headerDate: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  archivedTag: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  archivedText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  ticketCard: { backgroundColor: c.card, margin: 5, borderRadius: 20, padding: 20, paddingVertical: 30, shadowOffset: {width: 0, height: 5}, shadowOpacity: 0.15, shadowRadius: 15, elevation: 8 },
  ticketHeader: { alignItems: 'center', marginBottom: 20 },
  dashedLine: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 1, height: 1, width: '100%', marginVertical: 10, opacity: 0.5 },
  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketItemName: { fontSize: 16, fontWeight: '600', color: c.text },
  ticketItemSub: { fontSize: 12, color: c.textSec, marginTop: 2 },
  ticketItemPrice: { fontSize: 16, fontWeight: 'bold', color: c.text },
  ticketTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  ticketTotalLabel: { fontSize: 18, fontWeight: '800', color: c.text },
  ticketTotalValue: { fontSize: 24, fontWeight: '900' },

  summaryCard: { backgroundColor: c.card, borderRadius: 20, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  summaryLabel: { fontSize: 12, color: c.textSec, fontWeight: 'bold', letterSpacing: 1 },
  summaryValue: { fontSize: 28, fontWeight: '800', color: c.text },
  iconBox: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  progressContainer: { gap: 5 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 11, color: c.textSec, fontWeight: '600' },
  progressBarBg: { height: 6, backgroundColor: c.bg, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: c.textSec, marginBottom: 10, letterSpacing: 1 },
  todoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 15, borderRadius: 12, marginBottom: 8, elevation: 1 },
  checkBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, marginRight: 12 },
  itemText: { fontSize: 16, color: c.text, flex: 1 },
  inlineInput: { flex: 1, fontSize: 16, color: c.text, borderBottomWidth: 1, marginRight: 10, padding: 0 },
  miniDeleteBtn: { backgroundColor: c.border, width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addItemRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12, marginTop: 5, backgroundColor: c.card },
  addItemInput: { flex: 1, fontSize: 16, marginLeft: 10, color: c.text },
  doneItem: { borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border, elevation: 1, backgroundColor: c.card },
  doneHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  doneText: { fontSize: 16, color: c.text, flex: 1, fontWeight: '500', textDecorationLine: 'line-through', opacity: 0.6 },
  doneTotal: { fontSize: 15, fontWeight: 'bold' },
  doneFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 32, alignItems: 'center' },
  doneSub: { fontSize: 12, color: c.textSec },
  actionBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { backgroundColor: c.modal, borderRadius: 24, padding: 24, width: '100%', elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: c.text },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: c.textSec, marginBottom: 6, marginTop: 10 },
  inputBox: { backgroundColor: c.input, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 14, fontSize: 16, color: c.text },
  row: { flexDirection: 'row', gap: 15 },
  halfInput: { flex: 1 },
  modalActions: { flexDirection: 'row', marginTop: 25, gap: 12 },
  btnGhost: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12, backgroundColor: c.bg },
  btnPrimary: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 12 },
  text: { color: c.text },
  textSec: { color: c.textSec },
  danger: { color: c.danger },
  success: { color: c.success },
  input: { backgroundColor: c.input },
  border: { borderColor: c.border }
});