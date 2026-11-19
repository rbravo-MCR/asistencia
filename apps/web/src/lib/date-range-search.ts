export function dateRangeSearch(search: Record<string, unknown>): {
  from?: string;
  to?: string;
} {
  const from = search.from,
    to = search.to;
  const valid = (s: unknown): s is string =>
    typeof s === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (!valid(from) || !valid(to)) return {};
  const days = (Date.parse(to) - Date.parse(from)) / 86400000;
  return days >= 0 && days <= 92 ? { from, to } : {};
}
