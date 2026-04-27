import type { ScreenerResponse, SignalsResponse, RSRankingResponse, USRSRankingResponse } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchScreener(): Promise<ScreenerResponse> {
  const res = await fetch(`${API_BASE}/api/screener`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchSignals(): Promise<SignalsResponse> {
  const res = await fetch(`${API_BASE}/api/signals`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchRSRanking(): Promise<RSRankingResponse> {
  const res = await fetch(`${API_BASE}/api/rs-ranking`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchUSRSRanking(): Promise<USRSRankingResponse> {
  const res = await fetch(`${API_BASE}/api/rs-ranking/us`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchStockDetail(code: string) {
  const res = await fetch(`${API_BASE}/api/stock/${code}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
