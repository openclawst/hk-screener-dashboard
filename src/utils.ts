export function formatNumber(v: number): string {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return v.toString();
}

export function fmtTurnover(v: number): string {
  if (!v || v <= 0) return '—';
  if (v >= 1e9) return `HK$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `HK$${(v / 1e6).toFixed(0)}M`;
  if (v >= 1e3) return `HK$${(v / 1e3).toFixed(0)}K`;
  return `HK$${v}`;
}

export const signalLabels: Record<string, string> = {
  price_breakout: '📈突破',
  vol_surge: '🔥放量',
  price_ath: '🏆新高',
  strong_move: '💥強勢',
  above_ma20: '↗️趨勢',
};
