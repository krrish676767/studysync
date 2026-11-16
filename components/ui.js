'use client';

export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`alert ${kind}`}>{children}</div>;
}

export function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value ?? '-'}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

export function Badge({ kind = '', children }) {
  return <span className={`badge ${kind}`}>{children}</span>;
}

const STATUS_KIND = {
  active: 'good', completed: 'brand', dropped: 'bad', auditing: 'warn',
  graded: 'good', submitted: 'brand', resubmitted: 'brand', late: 'warn',
  urgent: 'bad', high: 'warn', medium: 'brand', low: '',
  student: 'brand', instructor: 'warn', admin: 'bad',
};
export function StatusBadge({ value }) {
  if (value === null || value === undefined || value === '') return <span className="muted">-</span>;
  return <Badge kind={STATUS_KIND[value] || ''}>{String(value).replace('_', ' ')}</Badge>;
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** columns: [{ key, label, render?(row), align? }] */
export function DataTable({ columns, rows, empty = 'Nothing to show yet.', rowKey }) {
  if (!rows || rows.length === 0) return <div className="empty">{empty}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((c) => <th key={c.key} className={c.align === 'right' ? 'right' : ''}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey ? rowKey(row) : i}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 'right' : ''}>
                  {c.render ? c.render(row) : (row[c.key] ?? <span className="muted">-</span>)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Loading({ state }) {
  if (state.error) return <Alert>{state.error}</Alert>;
  if (state.loading) return <div className="empty">Loading...</div>;
  return null;
}
