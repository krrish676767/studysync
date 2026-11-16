'use client';
import { useState } from 'react';
import { api, useData, fmtDate } from '@/lib/client';
import { useUser } from '@/components/AppShell';
import { Alert, Field, Stat, Badge, DataTable, Loading } from '@/components/ui';

function Editor({ note, onClose, onChanged }) {
  const user = useUser();
  const isNew = !note._id;
  const mine = isNew || note.owner_id === user.id;
  const [form, setForm] = useState({
    title: note.title || '', content: note.content || '', tags: (note.tags || []).join(', '),
    course_code: note.course_code || '', is_shared: Boolean(note.is_shared),
  });
  const [cards, setCards] = useState(note.flashcards || []);
  const [card, setCard] = useState({ question: '', answer: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function run(fn) {
    setError('');
    try { return await fn(); } catch (err) { setError(err.message); return null; }
  }
  const save = (e) => {
    e.preventDefault();
    run(async () => {
      if (isNew) await api('/api/notes', { method: 'POST', body: form });
      else await api(`/api/notes/${note._id}`, { method: 'PUT', body: form });
      onChanged(true);
    });
  };
  const remove = () => run(async () => {
    if (!window.confirm('Delete this note?')) return;
    await api(`/api/notes/${note._id}`, { method: 'DELETE' });
    onChanged(true);
  });
  const addCard = (e) => {
    e.preventDefault();
    run(async () => {
      const out = await api(`/api/notes/${note._id}/flashcards`, { method: 'POST', body: card });
      setCards([...cards, out.card]);
      setCard({ question: '', answer: '' });
      onChanged(false);
    });
  };
  const removeCard = (c) => run(async () => {
    await api(`/api/notes/${note._id}/flashcards?card_id=${c.card_id}`, { method: 'DELETE' });
    setCards(cards.filter((x) => x.card_id !== c.card_id));
    onChanged(false);
  });

  return (
    <div className="card">
      <div className="spread">
        <h2>{isNew ? 'New note' : mine ? 'Edit note' : `Note by ${note.owner_name}`}</h2>
        <button className="small" onClick={onClose}>Close</button>
      </div>
      <Alert>{error}</Alert>
      <form onSubmit={save}>
        <Field label="Title"><input value={form.title} onChange={set('title')} disabled={!mine} required /></Field>
        <Field label="Content"><textarea rows={8} value={form.content} onChange={set('content')} disabled={!mine} /></Field>
        <div className="form-grid">
          <Field label="Tags (comma separated)"><input value={form.tags} onChange={set('tags')} disabled={!mine} placeholder="dbms, exam" /></Field>
          <Field label="Course code (optional)"><input value={form.course_code} onChange={set('course_code')} disabled={!mine} placeholder="CS301" /></Field>
        </div>
        {mine && (
          <div className="spread">
            <label className="row small"><input type="checkbox" checked={form.is_shared} onChange={set('is_shared')} /> Share with everyone</label>
            <span className="row">
              {!isNew && <button type="button" className="danger" onClick={remove}>Delete</button>}
              <button className="primary">{isNew ? 'Create note' : 'Save changes'}</button>
            </span>
          </div>
        )}
        {!mine && user.role === 'admin' && <button type="button" className="danger" onClick={remove}>Delete (admin moderation)</button>}
      </form>

      {!isNew && (
        <div style={{ marginTop: 18 }}>
          <h3>Flashcards <span className="muted small">(embedded documents, added with $push and removed with $pull)</span></h3>
          {cards.length === 0 && <div className="small muted" style={{ marginBottom: 8 }}>No flashcards yet.</div>}
          {cards.map((c) => (
            <div className="flash" key={c.card_id}>
              <div className="spread"><b>Q: {c.question}</b>{mine && <button className="ghost danger small" onClick={() => removeCard(c)}>remove</button>}</div>
              <div>A: {c.answer}</div>
            </div>
          ))}
          {mine && (
            <form className="row" onSubmit={addCard}>
              <input style={{ flex: 1, minWidth: 160 }} placeholder="Question" value={card.question} onChange={(e) => setCard({ ...card, question: e.target.value })} required />
              <input style={{ flex: 1, minWidth: 160 }} placeholder="Answer" value={card.answer} onChange={(e) => setCard({ ...card, answer: e.target.value })} required />
              <button>Add card</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  const user = useUser();
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ q: '', tag: '', scope: 'all' });
  const [editing, setEditing] = useState(null);
  const query = new URLSearchParams(filters).toString();
  const list = useData(`/api/notes?${query}`);
  const stats = useData('/api/notes/stats');
  const totals = stats.data?.totals || {};

  function changed(close) {
    list.reload();
    stats.reload();
    if (close) setEditing(null);
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Notes</h1><div className="sub">Stored as documents in MongoDB: flexible tags, embedded flashcards, full-text search</div></div>
        <button className="primary" onClick={() => setEditing({})}>New note</button>
      </div>
      <Alert>{list.error || stats.error}</Alert>

      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Stat label="Notes I can see" value={totals.notes} />
        <Stat label="My notes" value={totals.mine} />
        <Stat label="Shared notes" value={totals.shared} />
        <Stat label="Flashcards" value={totals.flashcards} />
      </div>

      {editing && <Editor key={editing._id || 'new'} note={editing} onClose={() => setEditing(null)} onChanged={changed} />}

      <div className="grid side">
        <div>
          <form className="row" style={{ marginBottom: 14 }} onSubmit={(e) => { e.preventDefault(); setFilters({ ...filters, q }); }}>
            <input style={{ flex: 1, minWidth: 200 }} placeholder="Full-text search, e.g. normalization or trigger" value={q} onChange={(e) => setQ(e.target.value)} />
            <select style={{ width: 150 }} value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
              <option value="all">All notes</option><option value="mine">My notes</option><option value="shared">Shared by others</option>
            </select>
            <button>Search</button>
            {(filters.q || filters.tag) && <button type="button" className="ghost" onClick={() => { setQ(''); setFilters({ q: '', tag: '', scope: filters.scope }); }}>clear</button>}
          </form>
          {filters.tag && <p className="small">Filtered by tag <Badge kind="brand">{filters.tag}</Badge></p>}
          {list.loading && <Loading state={list} />}
          <div className="grid cols-2">
            {(list.data?.notes || []).map((n) => (
              <div className="card note" key={n._id} onClick={() => setEditing(n)}>
                <div className="spread">
                  <h3>{n.title}</h3>
                  <span className="row">
                    {n.course_code ? <Badge>{n.course_code}</Badge> : null}
                    {n.is_shared ? <Badge kind="good">shared</Badge> : <Badge>private</Badge>}
                  </span>
                </div>
                <div className="body">{n.content}</div>
                <div style={{ marginTop: 8 }}>{n.tags.map((t) => <span className="chip" key={t}>{t}</span>)}</div>
                <div className="small muted">
                  {n.owner_id === user.id ? 'You' : n.owner_name} &middot; updated {fmtDate(n.updated_at)} &middot; {n.flashcards.length} card(s) &middot; rev {n.revision}
                  {n.score ? ` · relevance ${n.score.toFixed(2)}` : ''}
                </div>
              </div>
            ))}
          </div>
          {list.data && list.data.notes.length === 0 && <div className="empty">No notes match.</div>}
        </div>
        <div>
          <div className="card">
            <h2>Tags</h2>
            <p className="small muted">Aggregation: $unwind, $group, $sort</p>
            {(stats.data?.tags || []).map((t) => (
              <button key={t.tag} className={`chip ${filters.tag === t.tag ? 'on' : ''}`}
                onClick={() => setFilters({ ...filters, tag: filters.tag === t.tag ? '' : t.tag })}>
                {t.tag} ({t.notes})
              </button>
            ))}
          </div>
          <div className="card">
            <h2>Notes by course</h2>
            <p className="small muted">Aggregation: $group with $size and $addToSet</p>
            <DataTable rows={stats.data?.byCourse} rowKey={(r) => r.course_code} empty="No notes yet." columns={[
              { key: 'course_code', label: 'Course' },
              { key: 'notes', label: 'Notes', align: 'right' },
              { key: 'flashcards', label: 'Cards', align: 'right' },
              { key: 'authors', label: 'Authors', align: 'right' },
            ]} />
          </div>
        </div>
      </div>
    </>
  );
}
