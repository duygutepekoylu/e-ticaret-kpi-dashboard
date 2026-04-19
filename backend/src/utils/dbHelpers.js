'use strict';

function paginate(query, { page = 1, limit = 20 } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;
  return { sql: `${query} LIMIT ? OFFSET ?`, params: [safeLimit, offset], page: safePage, limit: safeLimit };
}

// GA4 integer tarih → MySQL DATE string: 20241001 → '2024-10-01'
function ga4DateToSql(intDate) {
  const s = String(intDate);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

// MySQL DATE string → GA4 integer: '2024-10-01' → 20241001
function sqlDateToGa4(dateStr) {
  return parseInt(dateStr.replace(/-/g, ''), 10);
}

function buildDateFilter(dateFrom, dateTo, column = 'date') {
  const parts = [];
  const params = [];
  if (dateFrom) { parts.push(`${column} >= ?`); params.push(dateFrom); }
  if (dateTo)   { parts.push(`${column} <= ?`); params.push(dateTo); }
  return { sql: parts.join(' AND '), params };
}

module.exports = { paginate, ga4DateToSql, sqlDateToGa4, buildDateFilter };
