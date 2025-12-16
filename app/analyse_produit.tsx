import { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal,
  ActivityIndicator, Platform
} from 'react-native';
import { ThemedStatusBar } from '../src/components/ThemedStatusBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import formatMoney from '../src/utils/formatMoney';
import { fr, enUS } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import { getDb } from '../src/db/init';
import { useTheme } from '../src/context/ThemeContext';
import { useSettings } from '../src/context/SettingsContext';

const ITEMS_PER_PAGE = 10;

interface Produit {
  id: number;
  libelle: string;
}

interface Transaction {
  id: number;
  dateAchat: string;
  nomListe: string;
  produit: string;
  quantite: number;
  prixUnitaire: number;
  prixTotal: number;
  unite: string;
}

export default function AnalyseProduit() {
  const { activeTheme, isDarkMode } = useTheme();
  const { language, currency } = useSettings();
  const insets = useSafeAreaInsets();
  const { styles: s, colors } = getStyles(activeTheme, isDarkMode);

  const [produits, setProduits] = useState<Produit[]>([]);
  const [selectedProduit, setSelectedProduit] = useState<number | null>(-1);
  const [dateDebut, setDateDebut] = useState(startOfMonth(new Date()));
  const [dateFin, setDateFin] = useState(new Date());
  
  const [showDateDebutPicker, setShowDateDebutPicker] = useState(false);
  const [showDateFinPicker, setShowDateFinPicker] = useState(false);
  const [showProduitPicker, setShowProduitPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [periodSummary, setPeriodSummary] = useState<any[]>([]);
  
  const [totalProduitAnalyse, setTotalProduitAnalyse] = useState(0);
  const [totalQuantite, setTotalQuantite] = useState(0);
  const [unitePrincipale, setUnitePrincipale] = useState('');

  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'current_month' | 'last_month' | 'year' | 'custom'>('current_month');
  const [viewMode, setViewMode] = useState<'transactions' | 'summary'>('transactions');

  const [sortBy, setSortBy] = useState<'alpha' | 'amount' | 'qty'>('amount');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { loadProduits(); }, []);
  useEffect(() => { if (selectedProduit !== null) handleAnalyze(); }, [selectedProduit, dateDebut, dateFin]);
  useEffect(() => { setCurrentPage(1); }, [sortBy, selectedProduit, dateDebut, dateFin]);

  const loadProduits = () => {
    try {
      const db = getDb();
      const result = db.getAllSync(`
        SELECT DISTINCT libelleProduit as libelle
        FROM LigneAchat
        WHERE libelleProduit IS NOT NULL AND libelleProduit != ''
        ORDER BY libelleProduit ASC
      `);
      const allOption = { id: -1, libelle: 'Tous les produits' };
      setProduits([allOption, ...result.map((p: any, i: number) => ({ id: i + 1, libelle: p.libelle }))]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (selectedProduit === null) return;
    try {
      const db = getDb();
      const startStr = dateDebut.toISOString();
      const endStr = dateFin.toISOString();

      if (selectedProduit === -1) {
        // Résumé : tous les produits
        setViewMode('summary');
        const result = db.getAllSync(`
          SELECT 
            l.libelleProduit,
            SUM(l.quantite) as totalQte,
            SUM(l.prixTotal) as totalPrix,
            MAX(l.unite) as unite
          FROM LigneAchat l
          JOIN Achat a ON a.id = l.idAchat
          WHERE a.dateAchat BETWEEN ? AND ?
          GROUP BY l.libelleProduit
        `, [startStr, endStr] as any[]);

        setPeriodSummary(result);
        setTotalProduitAnalyse(
          result.reduce((sum: number, item: any) => sum + (item.totalPrix || 0), 0)
        );
        // nombre de types différents (Farine = 1 type)
        setTotalQuantite(result.length);
        setUnitePrincipale('Types');
      } else {
        // Détail : un produit spécifique
        setViewMode('transactions');
        const nomProduit = produits.find(p => p.id === selectedProduit)?.libelle || '';
        if (!nomProduit) return;

        const result = db.getAllSync(`
          SELECT 
            la.id, a.dateAchat, a.nomListe,
            la.libelleProduit as produit,
            la.quantite, la.prixUnitaire,
            la.prixTotal, la.unite
          FROM Achat a
          JOIN LigneAchat la ON a.id = la.idAchat
          WHERE la.libelleProduit = ?
            AND a.dateAchat BETWEEN ? AND ?
        `, [nomProduit, startStr, endStr] as any[]);

        const trans = result as Transaction[];
        setTransactions(trans);
        setTotalProduitAnalyse(
          trans.reduce((sum, t) => sum + (t.prixTotal || 0), 0)
        );
        // nombre d’achats de ce produit
        setTotalQuantite(trans.length);
        setUnitePrincipale('Achats');
      }

      setShowResults(true);
    } catch (e) {
      console.error(e);
    }
  };

  const applyFilter = (type: 'current_month' | 'last_month' | 'year') => {
    const now = new Date();
    setActiveFilter(type);
    if (type === 'current_month') {
      setDateDebut(startOfMonth(now));
      setDateFin(now);
    } else if (type === 'last_month') {
      const last = subMonths(now, 1);
      setDateDebut(startOfMonth(last));
      setDateFin(endOfMonth(last));
    } else if (type === 'year') {
      setDateDebut(startOfYear(now));
      setDateFin(endOfYear(now));
    }
  };

  const getProcessedData = () => {
    let data = viewMode === 'summary' ? [...periodSummary] : [...transactions];

    data.sort((a: any, b: any) => {
      if (sortBy === 'alpha') {
        const nameA = viewMode === 'summary' ? a.libelleProduit : a.nomListe;
        const nameB = viewMode === 'summary' ? b.libelleProduit : b.nomListe;
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'amount') {
        const amountA = viewMode === 'summary' ? a.totalPrix : a.prixTotal;
        const amountB = viewMode === 'summary' ? b.totalPrix : b.prixTotal;
        return (amountB || 0) - (amountA || 0);
      } else if (sortBy === 'qty') {
        const qtyA = viewMode === 'summary' ? a.totalQte : a.quantite;
        const qtyB = viewMode === 'summary' ? b.totalQte : b.quantite;
        return (qtyB || 0) - (qtyA || 0);
      }
      return 0;
    });

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedData = data.slice(startIndex, endIndex);
    const totalPages = Math.max(1, Math.ceil(data.length / ITEMS_PER_PAGE));

    return { paginatedData, totalPages };
  };

  const { paginatedData, totalPages } = getProcessedData();

  const renderDataList = () => {
    if (paginatedData.length === 0) {
      return (
        <View style={s.emptyBox}>
          <Ionicons name="cube-outline" size={40} color={colors.textSec} />
          <Text style={{ color: colors.textSec, marginTop: 10 }}>aucun produit</Text>
        </View>
      );
    }

    return paginatedData.map((item: any, idx: number) => {
      const isSummary = viewMode === 'summary';

      const title = isSummary
        ? item.libelleProduit
        : format(new Date(item.dateAchat), 'dd MMM yyyy', { locale: language === 'en' ? enUS : fr });

      const price = isSummary ? item.totalPrix : item.prixTotal;

      // Détail affiché : quantité * PU
      let detailText = '';
      if (isSummary) {
        const totalQte = Math.round(item.totalQte || 0);
        const avgPU = item.totalQte > 0 ? item.totalPrix / item.totalQte : 0;
        detailText = `${totalQte} ${item.unite || 'pcs'} x ${formatMoney(avgPU)} ${currency}`;
      } else {
        detailText = `${Math.round(item.quantite)} ${item.unite} x ${formatMoney(item.prixUnitaire)} ${currency}`;
      }

      return (
        <View key={idx} style={s.transactionItem}>
          <View style={s.transLeft}>
            <View style={[s.dateBadge, { backgroundColor: isDarkMode ? '#334155' : '#F3F4F6' }]}>
              {isSummary ? (
                <Ionicons name="cube" size={18} color={activeTheme.primary} />
              ) : (
                <Text style={s.dateDay}>{format(new Date(item.dateAchat), 'dd')}</Text>
              )}
            </View>
            <View>
              <Text style={s.transPrice}>{title}</Text>
              <Text style={s.transDetail}>{detailText}</Text>
            </View>
          </View>
          <Text style={[s.transPrice, { color: activeTheme.primary }]}>
            {formatMoney(price)} {currency}
          </Text>
        </View>
      );
    });
  };

  const savePdfFile = async () => {
    try {
      const rows = (viewMode === 'summary' ? periodSummary : transactions)
        .map((i: any) => {
          if (viewMode === 'summary') {
            const totalQte = Math.round(i.totalQte || 0);
            const avgPU = i.totalQte > 0 ? i.totalPrix / i.totalQte : 0;
            return `
              <tr style="border-bottom:1px solid #ddd;">
                <td style="padding:10px;">${i.libelleProduit}</td>
                <td style="padding:10px;">
                  ${totalQte} ${i.unite || 'pcs'} x ${formatMoney(avgPU)} Ar
                </td>
                <td style="padding:10px;text-align:right;">${formatMoney(i.totalPrix)} Ar</td>
              </tr>
            `;
          } else {
            return `
              <tr style="border-bottom:1px solid #ddd;">
                <td style="padding:10px;">${i.dateAchat.split('T')[0]}</td>
                <td style="padding:10px;">
                  ${Math.round(i.quantite)} ${i.unite} x ${formatMoney(i.prixUnitaire)} Ar
                </td>
                <td style="padding:10px;text-align:right;">${formatMoney(i.prixTotal)} Ar</td>
              </tr>
            `;
          }
        })
        .join('');

      const htmlContent = `
        <html>
          <body style="font-family:Helvetica;padding:20px;">
            <h1 style="color:${activeTheme.primary};text-align:center;">Rapport E-tsena</h1>
            <p style="text-align:center;">Période : ${format(dateDebut, 'dd/MM/yyyy')} - ${format(dateFin, 'dd/MM/yyyy')}</p>
            
            <div style="background:#f4f4f4;padding:15px;margin:20px 0;display:flex;justify-content:space-between;border-radius:8px;">
              <div><b>Quantité (${unitePrincipale}):</b> ${totalQuantite}</div>
              <div><b>Totals:</b> ${formatMoney(totalProduitAnalyse)} Ar</div>
            </div>

            <table style="width:100%;border-collapse:collapse;margin-top:20px;">
              <tr style="background:${activeTheme.primary};color:white;">
                <th style="padding:10px;text-align:left;">Produit / Date</th>
                <th style="padding:10px;text-align:left;">Détails (Qté x P.U)</th>
                <th style="padding:10px;text-align:right;">Total</th>
              </tr>
              ${rows}
            </table>
          </body>
        </html>
      `;

      const { uri: tempUri } = await Print.printToFileAsync({ html: htmlContent });

      // 🟢 Sécurisation : vérifier la présence de StorageAccessFramework
      const saf: any = (FileSystem as any).StorageAccessFramework;

      if (Platform.OS === 'android' && saf && saf.requestDirectoryPermissionsAsync) {
        const permissions = await saf.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64 = await FileSystem.readAsStringAsync(tempUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const fileName = `Rapport_Etsena_${new Date().getTime()}.pdf`;

          const createdUri = await saf.createFileAsync(
            permissions.directoryUri,
            fileName,
            'application/pdf'
          );
          await FileSystem.writeAsStringAsync(createdUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          Alert.alert('Succès', 'Fichier PDF enregistré dans le dossier choisi.');
          return;
        }
        // Permission refusée -> fallback partage
        await Sharing.shareAsync(tempUri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        // iOS ou Android sans SAF -> partage (inclut "Enregistrer dans les fichiers")
        await Sharing.shareAsync(tempUri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', "Impossible de générer le fichier PDF");
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={activeTheme.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ThemedStatusBar transparent />
      <LinearGradient
        colors={activeTheme.gradient as any}
        style={[s.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.push('/')} style={s.breadCrumb}>
          <Ionicons name="home-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={s.breadCrumbText}>Accueil {'>'} Rapports {'>'} </Text>
          <Text style={[s.breadCrumbText, { fontWeight: 'bold', color: '#fff' }]}>
            Analyse produit
          </Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.push('/rapports')}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Analyse produit</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => setShowMenu(true)}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Sélection produit */}
        <View style={s.card}>
          <Text style={s.label}>Produit à analyser</Text>
          <TouchableOpacity style={s.selectBox} onPress={() => setShowProduitPicker(true)}>
            <Text style={[s.selectText, { color: selectedProduit === null ? colors.textSec : colors.text }]}>
              {selectedProduit !== null && selectedProduit !== undefined
                ? produits.find(p => p.id === selectedProduit)?.libelle
                : 'Choisir un produit'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={activeTheme.primary} />
          </TouchableOpacity>
        </View>

        {/* Période */}
        <View style={s.card}>
          <Text style={s.label}>Période</Text>
          <View style={s.filterRow}>
            {['current_month', 'last_month', 'year'].map(f => (
              <TouchableOpacity
                key={f}
                style={[s.filterChip, activeFilter === f && { backgroundColor: activeTheme.primary }]}
                onPress={() => applyFilter(f as any)}
              >
                <Text
                  style={[
                    s.filterText,
                    activeFilter === f ? { color: '#fff' } : { color: colors.textSec },
                  ]}
                >
                  {f === 'current_month' ? 'Ce mois' : f === 'last_month' ? 'Mois dernier' : 'Année'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.dateRow}>
            <TouchableOpacity
              style={s.dateBtn}
              onPress={() => {
                setShowDateDebutPicker(true);
                setActiveFilter('custom');
              }}
            >
              <Text style={s.dateText}>{format(dateDebut, 'dd/MM/yyyy')}</Text>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={16} color={colors.textSec} />
            <TouchableOpacity
              style={s.dateBtn}
              onPress={() => {
                setShowDateFinPicker(true);
                setActiveFilter('custom');
              }}
            >
              <Text style={s.dateText}>{format(dateFin, 'dd/MM/yyyy')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Résultats */}
        {showResults && (
          <View style={{ marginTop: 10 }}>
            <View style={s.resultHeader}>
              <Text style={s.resultTitle}>Résultats</Text>
              <TouchableOpacity style={s.pdfBtn} onPress={savePdfFile}>
                <Ionicons name="document-text-outline" size={16} color="#fff" />
                <Text style={s.pdfBtnText}>PDF</Text>
              </TouchableOpacity>
            </View>

            {/* Cartes stats */}
            <View style={s.statsContainer}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={s.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={s.statIconCircle}>
                  <Ionicons name="layers" size={18} color="#10B981" />
                </View>
                <Text style={s.statLabelWhite}>Quantité ({unitePrincipale})</Text>
                <Text style={s.statValueWhite}>{totalQuantite}</Text>
              </LinearGradient>

              <LinearGradient
                colors={activeTheme.gradient as any}
                style={s.statCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={s.statIconCircle}>
                  <Ionicons name="wallet" size={18} color={activeTheme.primary} />
                </View>
                <Text style={s.statLabelWhite}>Totals</Text>
                <Text style={s.statValueWhite} numberOfLines={1} adjustsFontSizeToFit>
                  {formatMoney(totalProduitAnalyse)}
                </Text>
              </LinearGradient>
            </View>

            {/* Tri */}
            <View style={s.sortBar}>
              <Text style={s.sortLabel}>Trier par :</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  onPress={() => setSortBy('amount')}
                  style={[s.sortChip, sortBy === 'amount' && s.sortChipActive]}
                >
                  <Text
                    style={[
                      s.sortChipText,
                      sortBy === 'amount' ? s.sortChipTextActive : { color: colors.textSec },
                    ]}
                  >
                    Montant ▼
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSortBy('qty')}
                  style={[s.sortChip, sortBy === 'qty' && s.sortChipActive]}
                >
                  <Text
                    style={[
                      s.sortChipText,
                      sortBy === 'qty' ? s.sortChipTextActive : { color: colors.textSec },
                    ]}
                  >
                    Qté ▼
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSortBy('alpha')}
                  style={[s.sortChip, sortBy === 'alpha' && s.sortChipActive]}
                >
                  <Text
                    style={[
                      s.sortChipText,
                      sortBy === 'alpha' ? s.sortChipTextActive : { color: colors.textSec },
                    ]}
                  >
                    A - Z
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Liste + Pagination */}
            <View style={s.listContainer}>{renderDataList()}</View>

            {totalPages > 1 && (
              <View style={s.paginationContainer}>
                <TouchableOpacity
                  disabled={currentPage === 1}
                  onPress={() => setCurrentPage(p => p - 1)}
                  style={[s.pageBtn, currentPage === 1 && s.pageBtnDisabled]}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={currentPage === 1 ? '#ccc' : activeTheme.primary}
                  />
                </TouchableOpacity>
                <Text style={s.pageInfo}>
                  Page {currentPage} / {totalPages}
                </Text>
                <TouchableOpacity
                  disabled={currentPage === totalPages}
                  onPress={() => setCurrentPage(p => p + 1)}
                  style={[s.pageBtn, currentPage === totalPages && s.pageBtnDisabled]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={currentPage === totalPages ? '#ccc' : activeTheme.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Date pickers */}
      {showDateDebutPicker && (
        <DateTimePicker
          value={dateDebut}
          mode="date"
          onChange={(e, d) => {
            setShowDateDebutPicker(false);
            if (d) setDateDebut(d);
          }}
        />
      )}
      {showDateFinPicker && (
        <DateTimePicker
          value={dateFin}
          mode="date"
          onChange={(e, d) => {
            setShowDateFinPicker(false);
            if (d) setDateFin(d);
          }}
        />
      )}

      {/* Modal produit */}
      <Modal visible={showProduitPicker} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Sélectionner un produit</Text>
              <TouchableOpacity onPress={() => setShowProduitPicker(false)}>
                <Ionicons name="close" size={24} color={colors.textSec} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {produits.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    s.modalItem,
                    selectedProduit === p.id && { backgroundColor: activeTheme.primary + '15' },
                  ]}
                  onPress={() => {
                    setSelectedProduit(p.id);
                    setShowProduitPicker(false);
                  }}
                >
                  <Text
                    style={[
                      s.itemText,
                      selectedProduit === p.id && { color: activeTheme.primary, fontWeight: 'bold' },
                    ]}
                  >
                    {p.libelle}
                  </Text>
                  {selectedProduit === p.id && (
                    <Ionicons name="checkmark" size={20} color={activeTheme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Menu */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity style={s.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={s.menuBox}>
            <Text style={s.menuTitle}>Menu</Text>
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/statistiques');
              }}
            >
              <Ionicons name="stats-chart" size={20} color={activeTheme.primary} />
              <Text style={s.menuText}>Statistiques</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                setShowMenu(false);
                router.push('/');
              }}
            >
              <Ionicons name="home" size={20} color={activeTheme.primary} />
              <Text style={s.menuText}>Accueil</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const getStyles = (theme: any, dark: boolean) => {
  const colors = {
    bg: dark ? '#0F172A' : '#F8FAFC',
    card: dark ? '#1E293B' : '#FFFFFF',
    text: dark ? '#F1F5F9' : '#1F2933',
    textSec: dark ? '#94A3B8' : '#6B7280',
    border: dark ? '#334155' : '#E5E7EB',
    modal: dark ? '#1E293B' : '#FFFFFF',
    input: dark ? '#0F172A' : '#F9FAFB',
    primary: theme.primary,
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },
    header: { paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    breadCrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, opacity: 0.85 },
    breadCrumbText: { color: '#fff', fontSize: 11 },
    scrollContent: { padding: 20 },
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    label: { fontSize: 12, fontWeight: '700', color: colors.textSec, marginBottom: 8, textTransform: 'uppercase' },
    selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 12, backgroundColor: colors.input },
    selectText: { fontSize: 15, fontWeight: '500', color: colors.text },
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
    filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
    filterText: { fontSize: 12, fontWeight: '600', color: colors.textSec },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dateBtn: { flex: 1, alignItems: 'center', borderWidth: 1, borderColor: colors.border, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.input },
    dateText: { fontWeight: '600', color: colors.text },

    resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
    resultTitle: { fontWeight: 'bold', fontSize: 18, color: colors.text },

    pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF4444', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
    pdfBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },

    statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', elevation: 2 },
    statIconCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    statLabelWhite: { color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    statValueWhite: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 2 },

    sortBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sortLabel: { fontSize: 12, color: colors.textSec, marginRight: 10 },
    sortChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 15, backgroundColor: colors.input, marginRight: 8, borderWidth: 1, borderColor: colors.border },
    sortChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
    sortChipText: { fontSize: 11, color: colors.textSec },
    sortChipTextActive: { color: colors.primary, fontWeight: 'bold' },

    listContainer: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden' },
    transactionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: colors.border },
    transLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dateBadge: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    dateDay: { fontSize: 14, fontWeight: 'bold', color: colors.text },
    transPrice: { fontSize: 14, fontWeight: '700', color: colors.text },
    transDetail: { fontSize: 12, color: colors.textSec },
    emptyBox: { alignItems: 'center', padding: 30 },

    paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 15 },
    pageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    pageBtnDisabled: { opacity: 0.5 },
    pageInfo: { fontSize: 13, color: colors.textSec, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.modal, borderRadius: 20, padding: 20, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: 10 },
    modalTitle: { fontWeight: 'bold', fontSize: 18, color: colors.text },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderColor: colors.border },
    itemText: { fontSize: 16, color: colors.text },

    menuBox: { backgroundColor: colors.card, padding: 20, borderRadius: 20, position: 'absolute', top: 100, right: 20, width: 200, elevation: 10 },
    menuTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: colors.text },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
    menuText: { fontSize: 14, color: colors.text },
  });

  return { styles, colors };
};