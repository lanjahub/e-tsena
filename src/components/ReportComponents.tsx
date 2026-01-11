import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import formatMoney from '../utils/formatMoney';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TrendCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  currency: string;
  icon: string;
  isDarkMode: boolean;
  activeTheme: any;
}

export const TrendCard: React.FC<TrendCardProps> = ({
  title, currentValue, previousValue, currency, icon, isDarkMode, activeTheme
}) => {
  const difference = currentValue - previousValue;
  const percentChange = previousValue > 0 ? (difference / previousValue) * 100 : 0;
  const isPositive = difference > 0;
  
  const cardBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const textColor = isDarkMode ? '#F8FAFC' : '#1E293B';
  const textSecColor = isDarkMode ? '#94A3B8' : '#64748B';
  const borderColor = isDarkMode ? '#334155' : '#E2E8F0';
  
  // Détermine si on doit afficher la devise (pour les montants) ou juste le nombre (pour les articles)
  const shouldShowCurrency = !title.toLowerCase().includes('article') && !title.toLowerCase().includes('nombre');
  
  // Fonction pour formater les valeurs
  const formatValue = (value: number) => shouldShowCurrency ? `${formatMoney(value)} ${currency}` : Math.round(value).toString();
  
  return (
    <View style={[styles.trendCard, { backgroundColor: cardBg, borderColor }]}>
      {/* Header avec icône et badge de tendance */}
      <View style={styles.trendHeader}>
        <View style={[styles.trendIcon, { backgroundColor: activeTheme.primary + '15' }]}>
          <Ionicons name={icon as any} size={24} color={activeTheme.primary} />
        </View>
        <View style={[styles.trendBadge, { 
          backgroundColor: isPositive ? '#FEE2E2' : '#DCFCE7',
          borderColor: isPositive ? '#EF4444' : '#10B981'
        }]}>
          <Ionicons 
            name={isPositive ? "trending-up" : "trending-down"} 
            size={12} 
            color={isPositive ? "#EF4444" : "#10B981"} 
          />
          <Text style={[styles.trendPercent, { 
            color: isPositive ? "#EF4444" : "#10B981" 
          }]}>
            {Math.abs(percentChange).toFixed(1)}%
          </Text>
        </View>
      </View>
      
      {/* Titre de la métrique */}
      <Text style={[styles.trendTitle, { color: textColor }]}>{title}</Text>
      
      {/* Valeur actuelle mise en évidence */}
      <View style={styles.currentValueContainer}>
        <Text style={[styles.currentValueLabel, { color: textSecColor }]}>Ce mois</Text>
        <Text style={[styles.trendValue, { color: activeTheme.primary }]}>
          {formatValue(currentValue)}
        </Text>
      </View>
      
      {/* Séparateur visuel */}
      <View style={[styles.separator, { backgroundColor: borderColor }]} />
      
      {/* Comparaison détaillée */}
      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonHeader}>
          <Text style={[styles.comparisonHeaderText, { color: textSecColor }]}>
            vs Mois Précédent
          </Text>
          <View style={[styles.evolutionIndicator, {
            backgroundColor: isPositive ? '#FEE2E2' : '#DCFCE7'
          }]}>
            <Ionicons 
              name={isPositive ? "arrow-up" : "arrow-down"} 
              size={10} 
              color={isPositive ? "#EF4444" : "#10B981"} 
            />
          </View>
        </View>
        
        {/* Valeur précédente */}
        <View style={styles.previousValueRow}>
          <Text style={[styles.previousValueLabel, { color: textSecColor }]}>
            Mois précédent:
          </Text>
          <Text style={[styles.previousValue, { color: textColor }]}>
            {formatValue(previousValue)}
          </Text>
        </View>
        
        {/* Différence */}
        <View style={styles.differenceRow}>
          <Text style={[styles.differenceLabel, { color: textSecColor }]}>
            Différence:
          </Text>
          <Text style={[styles.differenceValue, { 
            color: isPositive ? "#EF4444" : "#10B981" 
          }]}>
            {isPositive ? '+' : ''}{formatValue(difference)}
          </Text>
        </View>
        
        {/* Explication contextuelle */}
        <View style={[styles.interpretationBox, {
          backgroundColor: isPositive ? '#FEF2F2' : '#F0FDF4',
          borderLeftColor: isPositive ? '#EF4444' : '#10B981'
        }]}>
          <Text style={[styles.interpretationText, { color: textColor }]}>
            {(() => {
              if (Math.abs(percentChange) < 1) return "Évolution stable";
              
              const action = title.includes('Dépenses') ? 'dépensé' : 
                            title.includes('Articles') ? 'acheté' :
                            'coûté en moyenne';
              
              const changeText = isPositive ? 
                `${Math.abs(percentChange).toFixed(1)}% de plus` : 
                `${Math.abs(percentChange).toFixed(1)}% de moins`;
                
              return `Vous avez ${action} ${changeText} ce mois-ci`;
            })()}
          </Text>
        </View>
      </View>
    </View>
  );
};

interface ProductRankingProps {
  products: Array<{
    name: string;
    quantity: number;
    totalSpent: number;
    frequency: number;
  }>;
  currency: string;
  isDarkMode: boolean;
  activeTheme: any;
  mode: 'spending' | 'quantity' | 'frequency';
}

export const ProductRanking: React.FC<ProductRankingProps> = ({
  products, currency, isDarkMode, activeTheme, mode
}) => {
  const cardBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const textColor = isDarkMode ? '#F8FAFC' : '#1E293B';
  const textSecColor = isDarkMode ? '#94A3B8' : '#64748B';
  
  const sortedProducts = [...products].sort((a, b) => {
    switch(mode) {
      case 'spending': return b.totalSpent - a.totalSpent;
      case 'quantity': return b.quantity - a.quantity;
      case 'frequency': return b.frequency - a.frequency;
      default: return 0;
    }
  }).slice(0, 5);
  
  const getDisplayValue = (product: any) => {
    switch(mode) {
      case 'spending': return `${formatMoney(product.totalSpent)} ${currency}`;
      case 'quantity': return `${product.quantity} unités`;
      case 'frequency': return `${product.frequency} fois`;
      default: return '';
    }
  };
  
  const maxValue = Math.max(...sortedProducts.map(p => {
    switch(mode) {
      case 'spending': return p.totalSpent;
      case 'quantity': return p.quantity;
      case 'frequency': return p.frequency;
      default: return 0;
    }
  }));
  
  const getModeTitle = () => {
    switch(mode) {
      case 'spending': return 'Dépenses';
      case 'quantity': return 'Quantités';
      case 'frequency': return 'Fréquence';
      default: return 'Unknown';
    }
  };

  return (
    <View style={[styles.rankingCard, { backgroundColor: cardBg }]}>
      <Text style={[styles.rankingTitle, { color: textColor }]}>
        Top 5 - {getModeTitle()}
      </Text>
      
      {sortedProducts.map((product, index) => {
        const value = mode === 'spending' ? product.totalSpent : 
                     mode === 'quantity' ? product.quantity : product.frequency;
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        
        return (
          <View key={index} style={styles.rankingItem}>
            <View style={styles.rankingLeft}>
              <View style={[styles.rankingPosition, { 
                backgroundColor: index < 3 ? activeTheme.primary : textSecColor + '20'
              }]}>
                <Text style={[styles.rankingPositionText, { 
                  color: index < 3 ? '#fff' : textSecColor 
                }]}>
                  {index + 1}
                </Text>
              </View>
              <View style={styles.rankingInfo}>
                <Text style={[styles.rankingName, { color: textColor }]} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={[styles.rankingValue, { color: activeTheme.primary }]}>
                  {getDisplayValue(product)}
                </Text>
              </View>
            </View>
            
            <View style={styles.rankingRight}>
              <View style={[styles.progressBar, { backgroundColor: textSecColor + '20' }]}>
                <View style={[styles.progressFill, { 
                  width: `${percentage}%`, 
                  backgroundColor: activeTheme.primary 
                }]} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

interface BudgetOverviewProps {
  budgets: Array<{
    category: string;
    allocated: number;
    spent: number;
    color: string;
  }>;
  currency: string;
  isDarkMode: boolean;
  activeTheme: any;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  budgets, currency, isDarkMode, activeTheme
}) => {
  const cardBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const textColor = isDarkMode ? '#F8FAFC' : '#1E293B';
  const textSecColor = isDarkMode ? '#94A3B8' : '#64748B';
  
  return (
    <View style={[styles.budgetCard, { backgroundColor: cardBg }]}>
      <Text style={[styles.budgetTitle, { color: textColor }]}>
        Aperçu Budgétaire
      </Text>
      
      {budgets.map((budget, index) => {
        const percentage = budget.allocated > 0 ? (budget.spent / budget.allocated) * 100 : 0;
        const isOverBudget = percentage > 100;
        const remaining = budget.allocated - budget.spent;
        
        return (
          <View key={index} style={styles.budgetItem}>
            <View style={styles.budgetHeader}>
              <Text style={[styles.budgetCategory, { color: textColor }]}>
                {budget.category}
              </Text>
              <Text style={[styles.budgetPercentage, { 
                color: isOverBudget ? '#EF4444' : activeTheme.primary 
              }]}>
                {percentage.toFixed(0)}%
              </Text>
            </View>
            
            <View style={[styles.budgetProgressBar, { backgroundColor: textSecColor + '20' }]}>
              <View style={[styles.budgetProgressFill, { 
                width: `${Math.min(percentage, 100)}%`, 
                backgroundColor: isOverBudget ? '#EF4444' : budget.color 
              }]} />
              {isOverBudget && (
                <View style={[styles.budgetOverfill, { 
                  width: `${Math.min(percentage - 100, 50)}%`,
                  backgroundColor: '#EF4444'
                }]} />
              )}
            </View>
            
            <View style={styles.budgetFooter}>
              <Text style={[styles.budgetSpent, { color: textSecColor }]}>
                {formatMoney(budget.spent)} / {formatMoney(budget.allocated)} {currency}
              </Text>
              <Text style={[styles.budgetRemaining, { 
                color: remaining >= 0 ? '#10B981' : '#EF4444' 
              }]}>
                {remaining >= 0 ? 'Reste: ' : 'Dépassé: '}
                {formatMoney(Math.abs(remaining))} {currency}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Simple Chart Component
export const ReportChart: React.FC<{
  data: Array<{ month: string; total: number; count: number }>;
  type: 'line' | 'bar';
  isDarkMode: boolean;
  activeTheme: any;
}> = ({ data, type, isDarkMode, activeTheme }) => {
  const cardBg = isDarkMode ? '#1E293B' : '#FFFFFF';
  const textColor = isDarkMode ? '#F8FAFC' : '#1E293B';
  
  const maxValue = Math.max(...data.map(item => item.total));
  const chartHeight = 200;
  const chartWidth = SCREEN_WIDTH - 80;
  
  return (
    <View style={[styles.chartCard, { backgroundColor: cardBg }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.chart, { width: Math.max(chartWidth, data.length * 60) }]}>
          {/* Y-axis labels */}
          <View style={styles.yAxis}>
            <Text style={[styles.axisLabel, { color: textColor }]}>
              {formatMoney(maxValue)}
            </Text>
            <Text style={[styles.axisLabel, { color: textColor }]}>
              {formatMoney(maxValue / 2)}
            </Text>
            <Text style={[styles.axisLabel, { color: textColor }]}>0</Text>
          </View>
          
          {/* Chart bars */}
          <View style={styles.chartBars}>
            {data.map((item, index) => {
              const barHeight = (item.total / maxValue) * (chartHeight - 40);
              return (
                <View key={item.month} style={styles.barContainer}>
                  <LinearGradient
                    colors={[activeTheme.primary, activeTheme.secondary]}
                    style={[
                      styles.bar,
                      { 
                        height: barHeight || 2,
                        marginTop: chartHeight - 40 - barHeight
                      }
                    ]}
                  />
                  <Text style={[styles.barLabel, { color: textColor }]} numberOfLines={1}>
                    {item.month}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Trend Card Styles
  trendCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 280,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  trendIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  trendPercent: {
    fontSize: 13,
    fontWeight: '800',
  },
  trendTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'left',
  },
  // Nouveaux styles pour l'interface améliorée
  currentValueContainer: {
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  currentValueLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  trendValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  separator: {
    height: 1,
    marginVertical: 12,
  },
  comparisonContainer: {
    flex: 1,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  comparisonHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  evolutionIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previousValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previousValueLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  previousValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  differenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  differenceLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  differenceValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  interpretationBox: {
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginTop: 6,
  },
  interpretationText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  comparisonValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Product Ranking Styles
  rankingCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  rankingTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankingPosition: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankingPositionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  rankingInfo: {
    flex: 1,
  },
  rankingName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  rankingValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  rankingRight: {
    width: 60,
    marginLeft: 12,
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
  
  // Budget Overview Styles
  budgetCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  budgetPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  budgetProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetOverfill: {
    height: '100%',
    position: 'absolute',
    right: 0,
    top: 0,
    opacity: 0.8,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetSpent: {
    fontSize: 11,
    fontWeight: '500',
  },
  budgetRemaining: {
    fontSize: 11,
    fontWeight: '700',
  },
  
  // Chart Styles
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  chart: {
    height: 240,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  yAxis: {
    width: 40,
    height: 200,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  axisLabel: {
    fontSize: 10,
    textAlign: 'right',
  },
  chartBars: {
    flex: 1,
    height: 200,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    minWidth: 40,
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 8,
    textAlign: 'center',
    transform: [{ rotate: '-45deg' }],
  },
});