export type PartnerTier = { min: number; percent: number; label: string };

export const PARTNER_TIERS: PartnerTier[] = [
  { min: 1000, percent: 1, label: "Starter" },
  { min: 3000, percent: 2, label: "Growth" },
  { min: 5000, percent: 3, label: "Pro" },
  { min: 10000, percent: 5, label: "Elite" },
  { min: 20000, percent: 7, label: "Whale" },
  { min: 30000, percent: 10, label: "Legend" },
];

export function tierForSubscribers(subs: number): PartnerTier | null {
  let match: PartnerTier | null = null;
  for (const t of PARTNER_TIERS) if (subs >= t.min) match = t;
  return match;
}

export function nextTier(subs: number): PartnerTier | null {
  for (const t of PARTNER_TIERS) if (subs < t.min) return t;
  return null;
}

export function progressToNext(subs: number): { current: PartnerTier | null; next: PartnerTier | null; pct: number } {
  const current = tierForSubscribers(subs);
  const next = nextTier(subs);
  if (!next) return { current, next: null, pct: 100 };
  const base = current?.min ?? 0;
  const span = next.min - base;
  const done = Math.max(0, subs - base);
  return { current, next, pct: Math.min(100, Math.round((done / span) * 100)) };
}

export function generateReferralCode(displayName: string | null): string {
  const base = (displayName || "p").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "p";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}
