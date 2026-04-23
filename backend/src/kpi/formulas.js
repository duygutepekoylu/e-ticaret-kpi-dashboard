'use strict';

// Tüm KPI hesaplamaları bu fonksiyonları kullanır — başka yerde formül yazılmaz.

function weightedAvg(rows, valueField, weightField) {
  const totalWeight = rows.reduce((sum, r) => sum + (Number(r[weightField]) || 0), 0);
  if (totalWeight === 0) return 0;
  const weightedSum = rows.reduce(
    (sum, r) => sum + (Number(r[valueField]) || 0) * (Number(r[weightField]) || 0),
    0
  );
  return weightedSum / totalWeight;
}

// spend=0 → null (0'a bölme hatası önlenir)
function roas(revenue, spend) {
  return spend > 0 ? revenue / spend : null;
}

// previous=0 → null
function growthRate(current, previous) {
  if (previous == null || previous <= 0) return null;
  return (current - previous) / previous;
}

function conversionRate(orders, sessions) {
  return sessions > 0 ? orders / sessions : 0;
}

function cohortRetentionRate(active, total) {
  return total > 0 ? active / total : 0;
}

module.exports = { weightedAvg, roas, growthRate, conversionRate, cohortRetentionRate };
