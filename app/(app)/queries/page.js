'use client';
import { useState } from 'react';
import { api, useData } from '@/lib/client';
import { Alert, Badge, Loading } from '@/components/ui';

function cell(v) {
  if (v === null || v === undefined) return <span className="muted">NULL</span>;
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export default function QueryLabPage() {
  const state = useData('/api/queries');
  const [active, setActive] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const queries = state.data?.queries || [];
  const levels = state.data?.levels || {};

  async function run(q) {
    setActive(q);
    setResult(null);
    setError('');
    setBusy(true);
    try { setResult(await api('/api/queries', { method: 'POST', body: { id: q.id } })); }
    catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Query Lab</h1>
          <div className="sub">{queries.length} catalogued SQL queries, from simple to complex. Each one runs live on MySQL with your role&apos;s database account.</div>
        </div>
      </div>
      <Loading state={state} />
      <div className="grid" style={{ gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="card" style={{ padding: 12 }}>
          {Object.entries(levels).map(([level, label]) => (
            <div key={level}>
              <div className="nav-label" style={{ color: 'var(--muted)', paddingLeft: 10 }}>{label}</div>
              {queries.filter((q) => q.level === level).map((q) => (
                <button key={q.id} className={`qitem ${active?.id === q.id ? 'active' : ''}`} onClick={() => run(q)}>
                  <span className="qid">{q.id}</span>{q.title}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div>
          {!active && <div className="card"><div className="empty">Pick a query on the left to see its SQL and run it.</div></div>}
          {active && (
            <div className="card">
              <div className="spread" style={{ marginBottom: 10 }}>
                <div>
                  <h2 style={{ marginBottom: 2 }}>{active.id}. {active.title}</h2>
                  <Badge kind="brand">{active.concept}</Badge>
                </div>
                <button className="primary" onClick={() => run(active)} disabled={busy}>{busy ? 'Running...' : 'Run again'}</button>
              </div>
              <pre className="sql">{active.sql}</pre>
              <Alert>{error}</Alert>
              {result && (
                <>
                  <p className="small muted">{result.rows.length} row(s) in {result.ms} ms, executed as MySQL user <b>{result.dbUser}</b></p>
                  <div className="table-wrap">
                    <table>
                      <thead><tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>
                        {result.rows.map((row, i) => (
                          <tr key={i}>{result.columns.map((c) => <td key={c} style={{ whiteSpace: 'pre' }}>{cell(row[c])}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.rows.length === 0 && <div className="empty">The query returned no rows.</div>}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
