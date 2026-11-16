'use client';
import { useCallback, useEffect, useState } from 'react';

/** fetch wrapper: JSON in, JSON out, throws Error(message) on failure */
export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** load data from an API route; returns { data, error, loading, reload } */
export function useData(path) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      const data = await api(path);
      setState({ data, error: '', loading: false });
    } catch (err) {
      setState((s) => ({ ...s, error: err.message, loading: false }));
    }
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

export function fmtDate(value, withTime = true) {
  if (!value) return '-';
  const d = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('en-IN', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtMinutes(min) {
  const m = Number(min || 0);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim();
}
