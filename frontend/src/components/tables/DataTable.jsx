import { useState } from 'react';

function SortIcon({ dir }) {
  if (!dir) return <span style={{ color: 'var(--color-border)', marginLeft: 4 }}>↕</span>;
  return <span style={{ color: 'var(--color-brand)', marginLeft: 4 }}>{dir === 'asc' ? '↑' : '↓'}</span>;
}

// columns: [{ key, label, render?, sortable?, align? }]
// rows: array of objects
export default function DataTable({ columns = [], rows = [], loading, emptyText = 'Veri bulunamadı', pageSize = 15 }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const sorted = [...rows].sort((a, b) => {
    if (!sortKey) return 0;
    const va = a[sortKey], vb = b[sortKey];
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === 'string' ? va.localeCompare(vb, 'tr') : (va - vb);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const th = {
    padding: '10px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-bg-page)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const td = {
    padding: '11px 14px',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    borderBottom: '1px solid var(--color-border-light)',
  };

  if (loading) {
    return (
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', gap: 16 }}>
            {columns.map((_, j) => (
              <div key={j} style={{ height: 14, flex: 1, borderRadius: 4, background: 'var(--color-border-light)' }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '48px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{emptyText}</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ ...th, textAlign: col.align ?? 'left', cursor: col.sortable !== false ? 'pointer' : 'default' }}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  {col.label}
                  {col.sortable !== false && <SortIcon dir={sortKey === col.key ? sortDir : null} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--color-bg-page)' }}>
                {columns.map(col => (
                  <td key={col.key} style={{ ...td, textAlign: col.align ?? 'left' }}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: '1px solid var(--color-border-light)' }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} / {sorted.length}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: page === 0 ? 'var(--color-text-muted)' : 'var(--color-text-primary)', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
            >
              ‹ Önceki
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: page === totalPages - 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer' }}
            >
              Sonraki ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
