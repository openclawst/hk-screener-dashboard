export interface StockSignal {
  price_breakout: boolean;
  vol_surge: boolean;
  price_ath: boolean;
  strong_move: boolean;
  above_ma20: boolean;
  signal_a: boolean;   // 強勢股延續（3MA×5MA交叉 + 250日線之上）
  signal_b: boolean;   // 弱勢股反轉（3MA×5MA交叉 + 250日線之下）
}

export interface Stock extends StockSignal {
  code: string;
  name: string;
  price: number;
  last_close: number;
  change_pct: number;
  change: number;
  high_20d: number;
  avg_vol: number;
  volume: number;
  vol_ratio: number;
  avg_close_20d: number;
  ma250: number;
  turnover_hkd: number;
  score: number;
}

export interface ScreenerResponse {
  mode: string;
  results: Stock[];
  timestamp: string;
  elapsed: number;
  total_scanned: number;
}

export interface SignalsResponse {
  signal_a: Stock[];
  signal_b: Stock[];
  total_a: number;
  total_b: number;
  timestamp: string;
  elapsed: number;
}

export interface RSStock {
  code: string;
  name: string;
  price: number;
  change_pct: number;
  rs_rating: number;   // 0-99 相對強度評分
  rs_score: number;    // 原始超額回報分數
  roc_3m: number;
  roc_6m: number;
  roc_9m: number;
  roc_12m: number;
  turnover_hkd: number;
  mkt_label: string;  // "大" | "中" | "小" | "—"
}

export interface RSRankingResponse {
  results: RSStock[];
  total: number;
  timestamp: string;
  elapsed: number;
}

export interface ScreenerConfig {
  mode: 'full_market' | 'watchlist';
  top_volume_stocks: number;
  volume_mult: number;
  min_price_change_pct: number;
  min_volume: number;
  min_price: number;
  price_breakout_days: number;
}
