// Lightweight client-side audit-score history (P3-2).
// Stores the previous Readiness Score for each mint in localStorage so we can
// show "before vs after" deltas without needing a backend write.

const KEY = "pmm.audit.scores.v1";

type Store = Record<string, { score: number; ready: boolean; at: string }>;

function read(): Store {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

function write(s: Store) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore quota */ }
}

export function getPreviousAudit(mint: string) {
  return read()[mint] || null;
}

export function recordAudit(mint: string, score: number, ready: boolean) {
  const s = read();
  s[mint] = { score, ready, at: new Date().toISOString() };
  write(s);
}
