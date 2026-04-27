import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown, Activity, Filter } from 'lucide-react';
import type { Stock, ScreenerResponse, SignalsResponse, RSRankingResponse } from './types';
import { fetchScreener, fetchSignals, fetchRSRanking } from './api';
import { formatNumber, fmtTurnover } from './utils';

// ── 子元件 ────────────────────────────────────────────────────

function SignalBadge({ flag, label }: { flag: boolean; label: string }) {
  if (!flag) return null;
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
      {label}
    </span>
  );
}

function ChangePill({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold ${up ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
    </span>
  );
}

function VolBar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio / 5, 1) * 100;
  const color = ratio >= 3 ? 'bg-red-500' : ratio >= 2 ? 'bg-orange-500' : ratio >= 1.5 ? 'bg-yellow-500' : 'bg-blue-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-12 text-right">{ratio.toFixed(1)}x</span>
    </div>
  );
}

function StockRow({ stock, rank }: { stock: Stock; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <tr
      className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer ${rank <= 3 ? 'bg-amber-500/5' : ''}`}
      onClick={() => setExpanded(!expanded)}
    >
      <td className="px-3 py-3 text-center text-gray-500 text-xs w-8">{rank}</td>
      <td className="px-3 py-3">
        <div className="font-mono text-cyan-400 font-semibold text-sm">{stock.code}</div>
      </td>
      <td className="px-3 py-3">
        <div className="text-gray-100 font-medium text-sm leading-tight">{stock.name}</div>
        {expanded && (
          <div className="mt-1 text-xs text-gray-500 grid grid-cols-2 gap-x-4">
            <div>均價20d: <span className="text-gray-400">HK${stock.avg_close_20d.toFixed(2)}</span></div>
            <div>250日均線: <span className="text-gray-400">HK${stock.ma250.toFixed(2)}</span></div>
            <div>均量: <span className="text-gray-400">{formatNumber(stock.avg_vol)}</span></div>
            <div>成交量: <span className="text-gray-400">{formatNumber(stock.volume)}</span></div>
            <div>昨收: <span className="text-gray-400">HK${stock.last_close.toFixed(2)}</span></div>
            <div>成交額: <span className="text-gray-400">{fmtTurnover(stock.turnover_hkd)}</span></div>
          </div>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <div className="text-gray-100 font-semibold">HK${stock.price.toFixed(2)}</div>
      </td>
      <td className="px-3 py-3 text-center">
        <ChangePill pct={stock.change_pct} />
      </td>
      <td className="px-3 py-3 min-w-[100px]">
        <VolBar ratio={stock.vol_ratio} />
      </td>
      <td className="px-3 py-3 text-center">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold
          ${stock.score >= 10 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
            stock.score >= 6 ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
            stock.score >= 3 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
            'bg-gray-700/50 text-gray-500 border border-gray-600/30'}`}>
          {stock.score}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap gap-1">
          <SignalBadge flag={stock.price_breakout} label="📈突破" />
          <SignalBadge flag={stock.vol_surge} label="🔥放量" />
          <SignalBadge flag={stock.price_ath} label="🏆新高" />
          <SignalBadge flag={stock.strong_move} label="💥強勢" />
          <SignalBadge flag={stock.above_ma20} label="↗️趨勢" />
          <SignalBadge flag={stock.signal_a} label="🚀強A" />
          <SignalBadge flag={stock.signal_b} label="🌙弱B" />
        </div>
      </td>
    </tr>
  );
}

function TopStats({ data }: { data: ScreenerResponse }) {
  const results = data.results || [];
  if (!results.length) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="col-span-5 bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 text-center text-gray-500">
          暫無數據
        </div>
      </div>
    );
  }
  const gainers = results.filter(s => (s.change_pct ?? 0) > 0);
  const losers = results.filter(s => (s.change_pct ?? 0) < 0);
  const avgGain = gainers.length ? (gainers.reduce((a, b) => a + (b.change_pct ?? 0), 0) / gainers.length).toFixed(1) : '0';
  const topGainer = results.reduce((a, b) => (a.change_pct ?? 0) > (b.change_pct ?? 0) ? a : b, results[0]);
  const topTurnover = results.reduce((a, b) => (a.turnover_hkd ?? 0) > (b.turnover_hkd ?? 0) ? a : b, results[0]);

  const stats = [
    { label: '符合條件', value: results.length, sub: `共掃描 ${data.total_scanned} 支`, color: 'text-cyan-400' },
    { label: '上漲', value: gainers.length, sub: `平均 +${avgGain}%`, color: 'text-green-400' },
    { label: '下跌', value: losers.length, sub: `${losers.length > 0 ? losers.reduce((a,b)=>a+(b.change_pct??0),0).toFixed(1)+'%' : '-'}`, color: 'text-red-400' },
    { label: '最大漲幅', value: `${(topGainer.change_pct ?? 0) > 0 ? '+' : ''}${(topGainer.change_pct ?? 0).toFixed(1)}%`, sub: topGainer.name, color: 'text-amber-400' },
    { label: '最高成交額', value: fmtTurnover(topTurnover.turnover_hkd ?? 0), sub: topTurnover.name, color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3">
          <div className="text-xs text-gray-500 mb-1">{s.label}</div>
          <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs text-gray-500 mt-0.5 truncate">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

function ScoreChart({ stocks }: { stocks: Stock[] }) {
  const chartData = stocks.slice(0, 20).map((s, i) => ({
    name: s.code,
    score: s.score,
    change: s.change_pct,
    rank: i + 1,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} interval={0} angle={-30} textAnchor="end" />
        <YAxis domain={[0, 12]} tick={{ fontSize: 10, fill: '#6b7280' }} />
        <Tooltip
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#9ca3af' }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any, n: any) => [n === 'score' ? `${v}分` : `${Number(v).toFixed(2)}%`, n === 'score' ? '異動分' : '升跌%']}
        />
        <Area type="monotone" dataKey="score" stroke="#06b6d4" fill="url(#scoreGrad)" strokeWidth={2} name="score" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function FilterBar({ config, onConfig }: {
  config: { minScore: number; signals: string[]; sortBy: string };
  onConfig: (c: typeof config) => void;
}) {
  const allSignals = ['price_breakout', 'vol_surge', 'price_ath', 'strong_move', 'above_ma20'];
  const signalNames: Record<string, string> = {
    price_breakout: '📈突破', vol_surge: '🔥放量', price_ath: '🏆新高',
    strong_move: '💥強勢', above_ma20: '↗️趨勢'
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-800/40 border border-gray-700/50 rounded-xl">
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-gray-500" />
        <span className="text-xs text-gray-500">篩選：</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 mr-1">最低分</span>
        {[3, 6, 10].map(v => (
          <button key={v} onClick={() => onConfig({ ...config, minScore: v })}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${config.minScore === v ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
            {v}+
          </button>
        ))}
      </div>
      <div className="h-4 w-px bg-gray-700" />
      {allSignals.map(sig => (
        <button key={sig} onClick={() => {
          const next = config.signals.includes(sig)
            ? config.signals.filter(x => x !== sig)
            : [...config.signals, sig];
          onConfig({ ...config, signals: next });
        }}
          className={`px-2 py-1 rounded text-xs transition-colors ${config.signals.includes(sig) ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-gray-700 text-gray-500 hover:bg-gray-600'}`}>
          {signalNames[sig]}
        </button>
      ))}
      <div className="h-4 w-px bg-gray-700" />
      <select value={config.sortBy} onChange={e => onConfig({ ...config, sortBy: e.target.value })}
        className="bg-gray-700 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600 outline-none">
        <option value="score">按分數</option>
        <option value="change_pct">按漲幅</option>
        <option value="vol_ratio">按成交量</option>
        <option value="turnover_hkd">按成交額</option>
      </select>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<ScreenerResponse | null>(null);
  const [signalsData, setSignalsData] = useState<SignalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filters, setFilters] = useState({ minScore: 0, signals: [] as string[], sortBy: 'score' });
  const [activeTab, setActiveTab] = useState<'screener' | 'signals' | 'rs'>('screener');
  const [rsData, setRsData] = useState<RSRankingResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, sigRes, rsRes] = await Promise.all([fetchScreener(), fetchSignals(), fetchRSRanking()]);
      setData(res);
      setSignalsData(sigRes);
      setRsData(rsRes);
      setLastUpdate(new Date());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = data ? data.results
    .filter(s => s.score >= filters.minScore)
    .filter(s => filters.signals.length === 0 || filters.signals.every(sig => (data!.results.find(r => r.code === s.code) as any)?.[sig]))
    .sort((a, b) => (b as any)[filters.sortBy] - (a as any)[filters.sortBy])
    : [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Activity className="text-cyan-400" size={20} />
              港股 Screener
              <div className="flex items-center ml-4 bg-gray-800 rounded-lg p-0.5">
                <button onClick={() => setActiveTab('screener')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeTab === 'screener' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                  📊 異動
                </button>
                <button onClick={() => setActiveTab('signals')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeTab === 'signals' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                  🚀🌙 MA信號
                </button>
                <button onClick={() => setActiveTab('rs')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${activeTab === 'rs' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>
                  📈 RS排名
                </button>
              </div>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {lastUpdate ? `更新於 ${lastUpdate.toLocaleTimeString('zh-HK')}` : '實時監控中'}
              {data && ` · 全市場模式 · 成交額 Top ${data.total_scanned}`}
            </p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-all">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? '掃描中...' : '重新掃描'}
          </button>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            ⚠️ {error} — <button onClick={load} className="underline hover:no-underline">重試</button>
          </div>
        )}

        {/* Stats */}
        {data && <TopStats data={data} />}

        {/* Chart */}
        {data && data.results.length > 0 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <div className="text-sm font-semibold text-gray-300 mb-3">📊 異動分數分佈（Top 20）</div>
            <ScoreChart stocks={data.results} />
          </div>
        )}

        {/* Filters */}
        {data && <FilterBar config={filters} onConfig={setFilters} />}

        {/* ── MA 信號分頁 ── */}
        {activeTab === 'signals' && signalsData && (
          <div className="space-y-4">
            {/* 信號A/B 統計 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-900/60 border border-cyan-700/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400 font-bold text-lg">🚀 強A</span>
                  <span className="text-xs text-gray-500">強勢股延續</span>
                </div>
                <div className="text-xs text-gray-400 mb-1">3MA×5MA 黃金交叉 + 250日線之上</div>
                <div className="text-2xl font-bold text-cyan-300">{signalsData.total_a}</div>
                <div className="text-xs text-gray-500 mt-1">支股票</div>
              </div>
              <div className="bg-gray-900/60 border border-amber-700/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-amber-400 font-bold text-lg">🌙 弱B</span>
                  <span className="text-xs text-gray-500">弱勢股反轉</span>
                </div>
                <div className="text-xs text-gray-400 mb-1">3MA×5MA 黃金交叉 + 250日線之下</div>
                <div className="text-2xl font-bold text-amber-300">{signalsData.total_b}</div>
                <div className="text-xs text-gray-500 mt-1">支股票</div>
              </div>
            </div>

            {/* 信號A 列表 */}
            {signalsData.signal_a.length > 0 && (
              <div className="bg-gray-900/60 border border-cyan-800/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-800 text-cyan-400 text-sm font-semibold">
                  🚀 強勢股延續（{signalsData.signal_a.length} 支）
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-2 text-center w-8">#</th>
                      <th className="px-3 py-2 text-left">代碼</th>
                      <th className="px-3 py-2 text-left">名稱</th>
                      <th className="px-3 py-2 text-right">現價</th>
                      <th className="px-3 py-2 text-center">升跌</th>
                      <th className="px-3 py-2 text-center w-10">分</th>
                      <th className="px-3 py-2 text-left">其他信號</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signalsData.signal_a.map((stock, i) => (
                      <tr key={stock.code} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-3 py-2 text-center text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-cyan-400 text-sm">{stock.code}</td>
                        <td className="px-3 py-2 text-gray-100 text-sm">{stock.name}</td>
                        <td className="px-3 py-2 text-right font-semibold">HK${stock.price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <ChangePill pct={stock.change_pct} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                            {stock.score}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <SignalBadge flag={stock.price_breakout} label="📈突破" />
                            <SignalBadge flag={stock.vol_surge} label="🔥放量" />
                            <SignalBadge flag={stock.price_ath} label="🏆新高" />
                            <SignalBadge flag={stock.strong_move} label="💥強勢" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 信號B 列表 */}
            {signalsData.signal_b.length > 0 && (
              <div className="bg-gray-900/60 border border-amber-800/40 rounded-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-800 text-amber-400 text-sm font-semibold">
                  🌙 弱勢股反轉（{signalsData.signal_b.length} 支）
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-2 text-center w-8">#</th>
                      <th className="px-3 py-2 text-left">代碼</th>
                      <th className="px-3 py-2 text-left">名稱</th>
                      <th className="px-3 py-2 text-right">現價</th>
                      <th className="px-3 py-2 text-center">升跌</th>
                      <th className="px-3 py-2 text-center w-10">分</th>
                      <th className="px-3 py-2 text-left">其他信號</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signalsData.signal_b.map((stock, i) => (
                      <tr key={stock.code} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-3 py-2 text-center text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-amber-400 text-sm">{stock.code}</td>
                        <td className="px-3 py-2 text-gray-100 text-sm">{stock.name}</td>
                        <td className="px-3 py-2 text-right font-semibold">HK${stock.price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <ChangePill pct={stock.change_pct} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            {stock.score}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <SignalBadge flag={stock.price_breakout} label="📈突破" />
                            <SignalBadge flag={stock.vol_surge} label="🔥放量" />
                            <SignalBadge flag={stock.price_ath} label="🏆新高" />
                            <SignalBadge flag={stock.strong_move} label="💥強勢" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {signalsData.signal_a.length === 0 && signalsData.signal_b.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                <Activity size={40} className="mx-auto mb-3 opacity-30" />
                <p>今日沒有 MA 交叉信號</p>
              </div>
            )}
          </div>
        )}

        {/* ── RS Ranking 分頁 ── */}
        {activeTab === 'rs' && rsData && (
          <div className="space-y-4">
            {/* RS Rating 說明 */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <div className="text-sm text-gray-300 font-semibold mb-1">📈 RS Rating（相對強度評分）</div>
              <div className="text-xs text-gray-500">
                基準：恒生指數 · 計算：3M/6M/9M/12M ROC 加權 vs 大市 · 分數 0-99（越高越強）
              </div>
            </div>

            {/* RS Top 20 圖表 */}
            {rsData.results.length > 0 && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <div className="text-sm font-semibold text-gray-300 mb-3">🏆 RS Rating 分布（Top 30）</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart
                    data={rsData.results.slice(0, 30).map((s, i) => ({
                      name: s.code,
                      rating: s.rs_rating,
                      change: s.change,
                      rank: i + 1,
                    }))}
                    margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="rsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280' }} interval={0} angle={-30} textAnchor="end" />
                    <YAxis domain={[0, 99]} tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
                      labelStyle={{ color: '#9ca3af' }}
                      formatter={(v: any, n: any) => [
                        n === 'rating' ? `${v} 分` : `${Number(v).toFixed(2)}%`,
                        n === 'rating' ? 'RS Rating' : '今日漲跌'
                      ]}
                    />
                    <Area type="monotone" dataKey="rating" stroke="#f59e0b" fill="url(#rsGrad)" strokeWidth={2} name="rating" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* RS Rating 表格 */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-500">
                共 {rsData.total} 檔 · 耗時 {rsData.elapsed}s
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-3 py-2 text-center w-8">#</th>
                      <th className="px-3 py-2 text-left">代碼</th>
                      <th className="px-3 py-2 text-left">名稱</th>
                      <th className="px-3 py-2 text-right">現價</th>
                      <th className="px-3 py-2 text-center">今日</th>
                      <th className="px-3 py-2 text-center w-12">RS Rating</th>
                      <th className="px-3 py-2 text-right">3M ROC</th>
                      <th className="px-3 py-2 text-right">6M ROC</th>
                      <th className="px-3 py-2 text-right">12M ROC</th>
                      <th className="px-3 py-2 text-center">市值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rsData.results.slice(0, 100).map((stock, i) => (
                      <tr key={stock.code} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="px-3 py-2 text-center text-gray-500 text-xs">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-amber-400 text-sm font-semibold">{stock.code}</td>
                        <td className="px-3 py-2 text-gray-100 text-sm">{stock.name}</td>
                        <td className="px-3 py-2 text-right font-semibold">HK${stock.price.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs font-bold ${(stock.change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(stock.change ?? 0) > 0 ? '+' : ''}{(stock.change ?? 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold
                            ${stock.rs_rating >= 90 ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50' :
                              stock.rs_rating >= 80 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40' :
                              stock.rs_rating >= 70 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' :
                              'bg-gray-700/50 text-gray-400 border border-gray-600/30'}`}>
                            {stock.rs_rating}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-right text-sm ${stock.roc_3m >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stock.roc_3m > 0 ? '+' : ''}{stock.roc_3m.toFixed(1)}%
                        </td>
                        <td className={`px-3 py-2 text-right text-sm ${stock.roc_6m >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stock.roc_6m > 0 ? '+' : ''}{stock.roc_6m.toFixed(1)}%
                        </td>
                        <td className={`px-3 py-2 text-right text-sm ${stock.roc_12m >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stock.roc_12m > 0 ? '+' : ''}{stock.roc_12m.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            stock.mkt_label === '大' ? 'bg-blue-500/20 text-blue-400' :
                            stock.mkt_label === '中' ? 'bg-purple-500/20 text-purple-400' :
                            stock.mkt_label === '小' ? 'bg-pink-500/20 text-pink-400' :
                            'bg-gray-700 text-gray-500'
                          }`}>{stock.mkt_label}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {activeTab === 'screener' && loading && !data && (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <RefreshCw size={24} className="animate-spin mr-3" />
            <span>正在掃描港股市場...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && data && activeTab === 'screener' && (
          <div className="text-center py-20 text-gray-500">
            <Activity size={40} className="mx-auto mb-3 opacity-30" />
            <p>目前沒有符合篩選條件的股票</p>
            <button onClick={() => setFilters({ minScore: 0, signals: [], sortBy: 'score' })}
              className="mt-2 text-cyan-400 text-sm hover:underline">清除篩選</button>
          </div>
        )}

        {!loading && data && filtered.length > 0 && activeTab === 'screener' && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3 text-center w-8">#</th>
                  <th className="px-3 py-3 text-left">代碼</th>
                  <th className="px-3 py-3 text-left">名稱</th>
                  <th className="px-3 py-3 text-right">現價</th>
                  <th className="px-3 py-3 text-center">升跌</th>
                  <th className="px-3 py-3 text-left min-w-[120px]">Vol / 均量</th>
                  <th className="px-3 py-3 text-center w-10">分</th>
                  <th className="px-3 py-3 text-left">信號</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((stock, i) => (
                  <StockRow key={stock.code} stock={stock} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-center text-xs text-gray-600 py-2">
          {activeTab === 'screener'
            ? `${filtered.length} 支符合條件`
            : `🚀 ${signalsData?.total_a ?? 0} 支 | 🌙 ${signalsData?.total_b ?? 0} 支`
          }
          {data && ` · 耗時 ${data.elapsed.toFixed(1)}s`}
        </div>
      </main>
    </div>
  );
}
