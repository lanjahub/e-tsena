export function formatMoney(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(Number(amount))) return '0';
  const value = Number(amount);

  // Supprimé les formats K, M, Mrd - affichage des montants complets
  // Format avec des séparateurs de milliers uniquement
  return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default formatMoney;
