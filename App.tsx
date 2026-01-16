
import React, { useState, useEffect, useMemo } from 'react';
import { StockMetrics, PeerData, AIAnalysisResult, AnalisaInput, DeepAnalysisResult, PublicCompanyData } from './types';
import { analyzeFundamentalAI, fetchPublicStockData, runDeepAnalisa } from './services/geminiService';
import { getBrokerInfo } from './services/brokerLogic';

// --- VISUAL COMPONENTS ---

const RobotLogo: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`relative flex items-center justify-center pointer-events-none ${className || ''}`}>
    <svg viewBox="0 0 120 100" className="w-full h-full">
      <line x1="10" y1="50" x2="110" y2="50" stroke="white" strokeWidth="0.1" opacity="0.2" />
      {[
        { x: 30, dur: '7s' },
        { x: 43, dur: '10s' },
        { x: 77, dur: '8s' },
        { x: 90, dur: '12s' }
      ].map((axis, i) => (
        <g key={i}>
          <line x1={axis.x} y1="15" x2={axis.x} y2="85" stroke="white" strokeWidth="0.3" opacity="0.25" />
          <rect x={axis.x - 0.5} y="30" width="1" height="12" fill="white" opacity="0.8">
            <animate attributeName="y" values="15;70;15" dur={axis.dur} repeatCount="indefinite" />
          </rect>
          <line x1={axis.x - 2} y1="15" x2={axis.x + 2} y2="15" stroke="white" strokeWidth="0.2" opacity="0.3" />
          <line x1={axis.x - 2} y1="85" x2={axis.x + 2} y2="85" stroke="white" strokeWidth="0.2" opacity="0.3" />
        </g>
      ))}
      <g className="animate-pulse">
        <circle cx="60" cy="50" r="1.5" fill="white" className="shadow-[0_0_15px_rgba(255,255,255,1)]" />
        <circle cx="60" cy="50" r="8" fill="none" stroke="white" strokeWidth="0.05" opacity="0.2" />
        <path d="M52 50 L68 50 M60 42 L60 58" stroke="white" strokeWidth="0.1" opacity="0.4" />
      </g>
      <path d="M10 20 L10 10 L20 10 M100 10 L110 10 L110 20 M110 80 L110 90 L100 90 M20 90 L10 90 L10 80" fill="none" stroke="white" strokeWidth="0.2" opacity="0.15" />
      <g opacity="0.3" fill="white" fontSize="2.5" fontFamily="monospace">
        <text x="12" y="15">L01_SYS</text>
        <text x="95" y="15">V_4.0</text>
        <text x="12" y="88">NODE_ALPHA</text>
      </g>
    </svg>
  </div>
);

const ChromeSentinel: React.FC = () => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const messages = [
    "Variabel dihimpun, korelasi ditentukan.",
    "Mengungkap lapisan tersembunyi.",
    "Indikator dihitung, keseimbangan kekuatan tren ditetapkan.",
    "Volatilitas ditakar, arah strategi dipastikan.",
    "Ketepatan lahir dari disiplin data, bukan dari spekulasi."
  ];

  useEffect(() => {
    let i = 0;
    const fullText = messages[msgIndex];
    setDisplayText('');
    const typeInterval = setInterval(() => {
      if (i < fullText.length) {
        setDisplayText(prev => prev + fullText.charAt(i));
        i++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => setMsgIndex(prev => (prev + 1) % messages.length), 4500);
      }
    }, 40);
    return () => clearInterval(typeInterval);
  }, [msgIndex]);

  return (
    <div className="w-full max-w-[95vw] lg:max-w-[1700px] flex flex-col items-center gap-6 animate-in fade-in duration-1000 px-4">
      <div className="w-full flex items-center justify-center gap-2 md:gap-6 lg:gap-12">
        <div className="flex-1 h-[0.5px] bg-gradient-to-r from-transparent via-white/5 to-white/25"></div>
        <div className="flex-shrink-0 max-w-[85%] lg:max-w-[75%] px-6">
          <p className="text-[13px] lg:text-[18px] font-mono text-white tracking-[0.05em] lg:tracking-[0.15em] uppercase text-center font-light leading-relaxed">
            <span className="inline-block pl-1">{displayText}</span>
            <span className="animate-pulse inline-block w-2 lg:w-2.5 h-4 lg:h-5 bg-cyan-400 ml-2 align-middle -mt-1 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
          </p>
        </div>
        <div className="flex-1 h-[0.5px] bg-gradient-to-l from-transparent via-white/5 to-white/25"></div>
      </div>
      <div className="w-64 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
    </div>
  );
};

const InputGroup: React.FC<{ label: string; value: number; onChange: (v: number) => void; placeholder?: string; suffix?: string; warning?: boolean }> = ({ label, value, onChange, placeholder, suffix, warning }) => (
  <div className={`group relative bg-white/[0.03] border ${warning ? 'border-rose-500/30' : 'border-white/10'} p-3 rounded-lg hover:border-cyan-500/50 hover:bg-white/[0.05] transition-all duration-300`}>
    <div className="absolute top-0 right-0 w-1 h-1 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <label className="text-[8px] text-slate-500 uppercase font-black block mb-1 tracking-tighter">{label}</label>
    <div className="flex items-center gap-2">
      <input 
        type="number" 
        value={value || ''} 
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder}
        className="w-full bg-transparent text-white font-mono text-xs lg:text-sm outline-none placeholder:text-white/10"
      />
      {suffix && <span className="text-[9px] text-slate-600 font-bold">{suffix}</span>}
    </div>
  </div>
);

// --- APP ---

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'HOME' | 'ANALISIS' | 'ANALISA'>('HOME');

  const [metrics, setMetrics] = useState<StockMetrics>({
    roe: 0, roa: 0, npm: 0, pbvInput: 0,
    revenue: 0, grossProfit: 0, operatingProfit: 0, eps: 0, peInput: 0, psInput: 0, ebitda: 0,
    totalAssets: 0, totalLiabilities: 0, totalEquity: 0, currentAssets: 0, currentLiabilities: 0, cash: 0, inventory: 0, derInput: 0,
    cfo: 0, capex: 0, fcf: 0,
    revNow: 0, revPrev: 0, revLastYear: 0, price: 0, bvps: 0, revps: 0
  });

  const [peers, setPeers] = useState<PeerData[]>(Array(5).fill({ roe: 0, roa: 0, npm: 0, per: 0, pbv: 0, ps: 0, der: 0, cr: 0 }));
  const [fundamentalResult, setFundamentalResult] = useState<AIAnalysisResult | null>(null);
  const [isFundamentalLoading, setIsFundamentalLoading] = useState(false);

  const sectorAvg = useMemo(() => {
    const count = peers.length;
    return {
      roe: peers.reduce((a, b) => a + b.roe, 0) / count,
      roa: peers.reduce((a, b) => a + b.roa, 0) / count,
      npm: peers.reduce((a, b) => a + b.npm, 0) / count,
      per: peers.reduce((a, b) => a + b.per, 0) / count,
      pbv: peers.reduce((a, b) => a + b.pbv, 0) / count,
      ps: peers.reduce((a, b) => a + b.ps, 0) / count,
      der: peers.reduce((a, b) => a + b.der, 0) / count,
      cr: peers.reduce((a, b) => a + b.cr, 0) / count,
    };
  }, [peers]);

  const [analisaInput, setAnalisaInput] = useState<AnalisaInput>({
    stockCode: '', price: 0, orderBookStatus: 'Bid Tebal (Ideal)', tradeBookStatus: 'Buy Dominan', brokerSummaryVal: 50, avgPriceTop3: 0, topBrokers: '', rawIntelligenceData: ''
  });
  const [publicData, setPublicData] = useState<PublicCompanyData | null>(null);
  const [deepResult, setDeepResult] = useState<DeepAnalysisResult | null>(null);
  const [isAnalisaLoading, setIsAnalisaLoading] = useState(false);
  const [brokerFeedback, setBrokerFeedback] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  const priceDeviation = useMemo(() => {
    if (analisaInput.price && analisaInput.avgPriceTop3) {
      return ((analisaInput.price - analisaInput.avgPriceTop3) / analisaInput.avgPriceTop3) * 100;
    }
    return 0;
  }, [analisaInput.price, analisaInput.avgPriceTop3]);

  const handleRunFundamental = async () => {
    setIsFundamentalLoading(true);
    try {
      const res = await analyzeFundamentalAI(metrics);
      setFundamentalResult(res);
    } catch (e: any) { 
      console.error(e);
      alert(`GAGAL: ${e.message || "Unknown Error"}`); 
    }
    setIsFundamentalLoading(false);
  };

  const handleFetchAnalisa = async () => {
    if (!analisaInput.stockCode) return alert("Input Kode Saham.");
    setIsAnalisaLoading(true);
    try {
      const data = await fetchPublicStockData(analisaInput.stockCode);
      setPublicData(data);
    } catch (e: any) { 
       console.error(e);
       alert(`GAGAL Fetch Data: ${e.message || "Unknown Error"}`); 
    }
    setIsAnalisaLoading(false);
  };

  const handleDeepAnalisa = async () => {
    setIsAnalisaLoading(true);
    try {
      const res = await runDeepAnalisa(analisaInput);
      setDeepResult(res);
    } catch (e: any) { 
      console.error(e);
      alert(`GAGAL ANALISA: ${e.message || "Unknown Error"}. \n\nCek Console (F12) atau pastikan API Key sudah masuk di Vercel Settings dan di-redeploy.`); 
    }
    setIsAnalisaLoading(false);
  };

  const handleCopyConclusion = () => {
    if (!deepResult) return;
    const text = `
TACTICAL INTEL REPORT [${analisaInput.stockCode}]
========================================
STRATEGY: ${deepResult.strategyType}
RISK LEVEL: ${deepResult.riskLevel}

[JANGKA PANJANG]
${deepResult.longTermSuitability}

[JANGKA PENDEK]
${deepResult.shortTermSuitability}

[PREDIKSI PASAR]
${deepResult.prediction}

[TACTICAL ZONE]
ENTRY: ${deepResult.entryArea}
TARGET: ${deepResult.targetPrice}
STOP LOSS: ${deepResult.stopLoss}

[POINT ANALISA]
${deepResult.reasoning.map(r => `• ${r}`).join('\n')}
========================================
DISCLAIMER: ${deepResult.dynamicDisclaimer}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const updateMetric = (k: keyof StockMetrics, v: number) => setMetrics(prev => ({ ...prev, [k]: v }));
  const updatePeer = (idx: number, k: keyof PeerData, v: number) => {
    const newPeers = [...peers];
    newPeers[idx] = { ...newPeers[idx], [k]: v };
    setPeers(newPeers);
  };

  const handleBrokerChange = (val: string) => {
    setAnalisaInput(p => ({ ...p, topBrokers: val.toUpperCase() }));
    const codes = val.toUpperCase().split(',').map(s => s.trim()).filter(s => s.length > 0);
    setBrokerFeedback(codes.map(c => {
      const info = getBrokerInfo(c);
      return `${c}: ${info.type === 'RICH' ? 'RICH' : info.type === 'KONGLO' ? 'KONGLO' : info.type === 'AMPAS' ? 'RITEL' : 'CAMPUR'}`;
    }));
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-brand-text font-sans overflow-hidden selection:bg-cyan-500/30">
      <nav className="z-50 border-b border-white/5 bg-black/80 backdrop-blur-md px-12 py-8 flex justify-center sticky top-0">
        <div className="flex gap-16 items-center">
          {['HOME', 'ANALISIS', 'ANALISA'].map((p) => (
            <button key={p} onClick={() => setCurrentPage(p as any)}
              className={`text-[11px] font-black tracking-[0.5em] uppercase transition-all duration-500 ${
                currentPage === p ? 'text-cyan-400 border-b border-cyan-500 pb-1' : 'text-slate-600 hover:text-white'
              }`}
            >{p}</button>
          ))}
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {currentPage === 'HOME' && (
          <div className="min-h-full flex flex-col items-center justify-center space-y-24 p-12">
            <RobotLogo className="w-64 h-64 lg:w-96 lg:h-96 opacity-100" />
            <ChromeSentinel />
          </div>
        )}

        {currentPage === 'ANALISIS' && (
          <div className="relative">
            {isFundamentalLoading && (
              <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/70 backdrop-blur-2xl animate-in fade-in duration-700">
                <RobotLogo className="w-48 h-48 lg:w-80 lg:h-80 animate-pulse" />
                <div className="mt-12 space-y-4 text-center">
                  <p className="text-cyan-400 font-mono text-[11px] tracking-[1em] uppercase animate-pulse">Deep_Fundamental_Scanning</p>
                  <div className="h-[2px] w-64 bg-white/10 rounded-full overflow-hidden mx-auto">
                    <div className="h-full bg-cyan-500 animate-[loading-bar_2s_infinite]"></div>
                  </div>
                  <p className="text-slate-500 font-mono text-[9px] uppercase tracking-widest italic mt-4">ArthaVision AI Core is processing financial forensics...</p>
                </div>
              </div>
            )}
            <div className={`max-w-[1400px] mx-auto px-8 lg:px-16 py-12 space-y-12 animate-in fade-in zoom-in-95 duration-1000 pb-60 transition-all ${isFundamentalLoading ? 'blur-md grayscale opacity-30 pointer-events-none' : ''}`}>
              <div className="flex justify-center items-center py-12 relative">
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/5 h-[1px] bg-gradient-to-r from-transparent to-white/10 hidden lg:block"></div>
                 <RobotLogo className="w-40 h-40 lg:w-64 lg:h-64 shrink-0 relative z-10" />
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/5 h-[1px] bg-gradient-to-l from-transparent to-white/10 hidden lg:block"></div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-12">
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="relative group p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-6 hover:border-cyan-500/20 transition-all">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                         <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                           <span className="w-1 h-3 bg-cyan-500"></span> Core Metrics
                         </h3>
                         <span className="text-[8px] font-mono text-slate-700 uppercase">Module_01</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="ROE (Return on Equity)" value={metrics.roe} onChange={v => updateMetric('roe', v)} suffix="%" />
                        <InputGroup label="ROA (Return on Assets)" value={metrics.roa} onChange={v => updateMetric('roa', v)} suffix="%" />
                        <InputGroup label="NPM (Net Profit Margin)" value={metrics.npm} onChange={v => updateMetric('npm', v)} suffix="%" />
                        <InputGroup label="PBV (Market Premium)" value={metrics.pbvInput} onChange={v => updateMetric('pbvInput', v)} suffix="x" />
                      </div>
                    </div>
                    <div className="relative group p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-6 hover:border-cyan-500/20 transition-all">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                         <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                           <span className="w-1 h-3 bg-cyan-500"></span> Income Statement
                         </h3>
                         <span className="text-[8px] font-mono text-slate-700 uppercase">Module_02</span>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <InputGroup label="Revenue" value={metrics.revenue} onChange={v => updateMetric('revenue', v)} suffix="B" />
                        <InputGroup label="Gross Profit" value={metrics.grossProfit} onChange={v => updateMetric('grossProfit', v)} suffix="B" />
                        <InputGroup label="Op. Profit" value={metrics.operatingProfit} onChange={v => updateMetric('operatingProfit', v)} suffix="B" />
                        <InputGroup label="EPS" value={metrics.eps} onChange={v => updateMetric('eps', v)} />
                        <InputGroup label="PE Ratio" value={metrics.peInput} onChange={v => updateMetric('peInput', v)} suffix="x" />
                        <InputGroup label="EBITDA" value={metrics.ebitda} onChange={v => updateMetric('ebitda', v)} suffix="B" />
                      </div>
                    </div>
                    <div className="relative group p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-6 hover:border-cyan-500/20 transition-all">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                         <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                           <span className="w-1 h-3 bg-cyan-500"></span> Balance Sheet
                         </h3>
                         <span className="text-[8px] font-mono text-slate-700 uppercase">Module_03</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <InputGroup label="Total Assets" value={metrics.totalAssets} onChange={v => updateMetric('totalAssets', v)} suffix="B" />
                        <InputGroup label="Total Liabilities" value={metrics.totalLiabilities} onChange={v => updateMetric('totalLiabilities', v)} suffix="B" />
                        <InputGroup label="Total Equity" value={metrics.totalEquity} onChange={v => updateMetric('totalEquity', v)} suffix="B" />
                        <InputGroup label="DER (Debt/Equity)" value={metrics.derInput} onChange={v => updateMetric('derInput', v)} suffix="x" />
                        <InputGroup label="Current Assets" value={metrics.currentAssets} onChange={v => updateMetric('currentAssets', v)} suffix="B" />
                        <InputGroup label="Current Liab." value={metrics.currentLiabilities} onChange={v => updateMetric('currentLiabilities', v)} suffix="B" />
                      </div>
                    </div>
                    <div className="relative group p-6 bg-white/[0.02] border border-white/5 rounded-2xl space-y-6 hover:border-cyan-500/20 transition-all">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                         <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                           <span className="w-1 h-3 bg-cyan-500"></span> Cash Flow Unit
                         </h3>
                         <span className="text-[8px] font-mono text-slate-700 uppercase">Module_04</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <InputGroup label="CFO" value={metrics.cfo} onChange={v => updateMetric('cfo', v)} suffix="B" />
                        <InputGroup label="Capex" value={metrics.capex} onChange={v => updateMetric('capex', v)} suffix="B" />
                        <InputGroup label="FCF" value={metrics.fcf} onChange={v => updateMetric('fcf', v)} suffix="B" />
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                         <InputGroup label="Rev (Current)" value={metrics.revNow} onChange={v => updateMetric('revNow', v)} />
                         <InputGroup label="Rev (YoY Last)" value={metrics.revLastYear} onChange={v => updateMetric('revLastYear', v)} />
                      </div>
                    </div>
                  </div>
                  <div className="pt-8">
                     <button onClick={handleRunFundamental} disabled={isFundamentalLoading} className="w-full relative py-8 bg-white text-black font-black uppercase tracking-[0.5em] text-sm overflow-hidden group hover:bg-cyan-500 hover:text-white transition-all duration-700 rounded-xl">
                       <div className="absolute inset-0 w-full h-full bg-cyan-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                       <span className="relative z-10">{isFundamentalLoading ? "SYNCHRONIZING_DATA..." : "INITIATE_AI_REASONING"}</span>
                     </button>
                  </div>
                </div>
                <div className="space-y-10">
                  <div className="bg-white/[0.03] border border-white/10 p-8 rounded-3xl space-y-8 backdrop-blur-sm">
                    <div className="flex justify-between items-baseline border-b border-white/5 pb-4">
                      <h3 className="text-[12px] font-black text-white uppercase tracking-widest italic">Sector Comparison</h3>
                      <div className="flex gap-1">
                         <div className="w-1 h-1 bg-cyan-500 rounded-full"></div>
                         <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                         <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {peers.map((p, i) => (
                        <div key={i} className="group p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all">
                          <div className="flex justify-between items-center mb-3">
                             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Comp_{i+1}</span>
                             <div className="h-[2px] w-8 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 w-1/3 group-hover:w-full transition-all duration-1000"></div>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {['roe','per','pbv','der'].map(key => (
                              <div key={key} className="space-y-1">
                                <label className="text-[7px] text-slate-600 uppercase font-bold block">{key}</label>
                                <input type="number" value={(p as any)[key]} onChange={e => updatePeer(i, key as any, parseFloat(e.target.value) || 0)} className="w-full bg-black/50 text-white font-mono text-[10px] px-2 py-1.5 rounded border border-white/5 outline-none focus:border-cyan-500" placeholder="0.00" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-6 border-t border-white/10 space-y-4">
                      <div className="flex justify-between items-end">
                         <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Global Avg</span>
                         <span className="text-[9px] font-mono text-slate-500">PROCESSED_DATA</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
                           <span className="text-[8px] text-slate-600 block uppercase mb-1">ROE</span>
                           <span className="text-sm font-mono text-white font-bold">{sectorAvg.roe.toFixed(2)}%</span>
                         </div>
                         <div className="p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
                           <span className="text-[8px] text-slate-600 block uppercase mb-1">PER</span>
                           <span className="text-sm font-mono text-white font-bold">{sectorAvg.per.toFixed(2)}x</span>
                         </div>
                         <div className="p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
                           <span className="text-[8px] text-slate-600 block uppercase mb-1">PBV</span>
                           <span className="text-sm font-mono text-white font-bold">{sectorAvg.pbv.toFixed(2)}x</span>
                         </div>
                         <div className="p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/10">
                           <span className="text-[8px] text-slate-600 block uppercase mb-1">DER</span>
                           <span className="text-sm font-mono text-white font-bold">{sectorAvg.der.toFixed(2)}x</span>
                         </div>
                      </div>
                    </div>
                  </div>
                  {fundamentalResult && (
                    <div className="bg-cyan-950/20 border border-cyan-500/50 p-10 rounded-3xl space-y-10 animate-in zoom-in-95 duration-700 relative overflow-hidden">
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl"></div>
                      <div className="relative z-10 flex justify-between items-start">
                         <div className="space-y-2">
                           <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-[9px] font-black uppercase tracking-widest rounded-full">AI Analytical Result</span>
                           <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{fundamentalResult.verdict.replace('_', ' ')}</h2>
                         </div>
                         <div className="text-right">
                           <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Confidence</div>
                           <div className="text-4xl font-black font-mono text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{fundamentalResult.fundamentalScore}%</div>
                         </div>
                      </div>
                      <div className="relative z-10 grid grid-cols-2 gap-4 p-6 bg-black/40 rounded-2xl border border-white/5">
                        {[
                          { label: 'Profitability Quality', value: fundamentalResult.accuracyMatrix?.profitabilityQuality || 0 },
                          { label: 'Solvency Risk Verify', value: fundamentalResult.accuracyMatrix?.solvencyRisk || 0 },
                          { label: 'Valuation Margin', value: fundamentalResult.accuracyMatrix?.valuationMargin || 0 },
                          { label: 'Cash Flow Integrity', value: fundamentalResult.accuracyMatrix?.cashFlowIntegrity || 0 },
                        ].map((item, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-[8px] font-mono uppercase tracking-widest">
                              <span className="text-slate-500">{item.label}</span>
                              <span className="text-cyan-400">{item.value}%</span>
                            </div>
                            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-cyan-500" style={{ width: `${item.value}%` }}></div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="relative z-10 space-y-8">
                         <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em] flex items-center gap-2">
                               <div className="w-6 h-[1px] bg-cyan-500"></div> Long Term Outlook
                            </h4>
                            <p className="text-[14px] text-slate-200 leading-relaxed font-medium italic text-justify">{fundamentalResult.longTermInsight}</p>
                         </div>
                         <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em] flex items-center gap-2">
                               <div className="w-6 h-[1px] bg-cyan-500"></div> Strategic Momentum
                            </h4>
                            <p className="text-[14px] text-slate-300 leading-relaxed italic text-justify">{fundamentalResult.shortTermInsight}</p>
                         </div>
                      </div>
                      <div className="relative z-10 p-6 bg-black/40 rounded-2xl border border-white/5">
                         <h5 className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-3">Competitive Advantage (MOAT)</h5>
                         <p className="text-[12px] text-slate-400 italic leading-relaxed">{fundamentalResult.competitiveMoat || "Daya saing kompetitif terdeteksi stabil dalam koridor sektoral."}</p>
                      </div>
                      <div className="text-center pt-4 opacity-30 group hover:opacity-100 transition-opacity">
                         <span className="text-[9px] font-mono text-white uppercase tracking-[0.5em]">Analytical Integrity Protocol Active</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'ANALISA' && (
          <div className="max-w-[1600px] mx-auto px-6 lg:px-12 py-10 space-y-8 animate-in fade-in duration-700 pb-40">
             <div className="flex justify-between items-end border-b border-white/10 pb-6">
                <div>
                   <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">TACTICAL <span className="text-cyan-500">WAR ROOM</span></h1>
                   <p className="text-[11px] font-mono text-slate-500 mt-2 uppercase tracking-widest">Bandarmology Telemetry System & AI Strategic Command</p>
                </div>
                <div className="flex items-center gap-4">
                   <input type="text" placeholder="CODE" value={analisaInput.stockCode} onChange={(e) => setAnalisaInput({ ...analisaInput, stockCode: e.target.value.toUpperCase() })} className="w-32 bg-white/5 border border-white/10 p-3 text-center text-white font-mono font-bold text-xl uppercase focus:border-cyan-500 outline-none rounded-lg" />
                   <button onClick={handleFetchAnalisa} disabled={isAnalisaLoading} className="px-6 py-3 bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] hover:bg-cyan-500 hover:text-white transition-all rounded-lg">Fetch Intel</button>
                </div>
             </div>

             <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-8">
                <div className="space-y-6">
                   <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl space-y-6">
                      <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                         <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></span> Price Action Telemetry
                      </h3>
                      <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <InputGroup label="Current Price" value={analisaInput.price} onChange={v => setAnalisaInput({...analisaInput, price: v})} />
                            <InputGroup label="Avg Broker Top 3" value={analisaInput.avgPriceTop3} onChange={v => setAnalisaInput({...analisaInput, avgPriceTop3: v})} />
                         </div>
                         <div className={`p-4 rounded-xl border ${priceDeviation < -2 ? 'bg-emerald-900/20 border-emerald-500/30' : priceDeviation > 2 ? 'bg-rose-900/20 border-rose-500/30' : 'bg-slate-900/20 border-slate-700/30'}`}>
                            <div className="flex justify-between items-center mb-2">
                               <span className="text-[9px] uppercase font-bold text-slate-400">Posisi Harga vs Bandar</span>
                               <span className={`text-lg font-mono font-bold ${priceDeviation < -2 ? 'text-emerald-400' : priceDeviation > 2 ? 'text-rose-400' : 'text-slate-300'}`}>{priceDeviation > 0 ? '+' : ''}{priceDeviation.toFixed(2)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-black rounded-full overflow-hidden relative">
                               <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/30 z-10"></div>
                               <div className={`h-full transition-all duration-500 ${priceDeviation < 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(Math.abs(priceDeviation) * 5, 50)}%`, marginLeft: priceDeviation < 0 ? 'auto' : '50%', marginRight: priceDeviation < 0 ? '50%' : 'auto' }}></div>
                            </div>
                            <p className="text-[9px] mt-2 italic text-slate-500 text-center">{priceDeviation < -2 ? "Potensi Akumulasi (Under Value)" : priceDeviation > 2 ? "Potensi Distribusi (Over Value)" : "Netral Area"}</p>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl space-y-6">
                      <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Market Depth Analysis</h3>
                      <div className="space-y-4">
                         <div>
                           <label className="text-[9px] text-slate-500 uppercase font-bold block mb-2">Order Book Structure</label>
                           <select value={analisaInput.orderBookStatus} onChange={(e)=>setAnalisaInput({...analisaInput, orderBookStatus: e.target.value})} className="w-full bg-black border border-white/10 p-3 text-white text-[11px] font-mono outline-none rounded-lg focus:border-cyan-500 transition-colors">
                             <option>Bid Tebal (Ideal)</option>
                             <option>Ask Tebal (Panic)</option>
                             <option>Bid Tipis (Fake)</option>
                             <option>Seimbang</option>
                           </select>
                         </div>
                         <div>
                           <label className="text-[9px] text-slate-500 uppercase font-bold block mb-2">Trade Book Action</label>
                           <select value={analisaInput.tradeBookStatus} onChange={(e)=>setAnalisaInput({...analisaInput, tradeBookStatus: e.target.value})} className="w-full bg-black border border-white/10 p-3 text-white text-[11px] font-mono outline-none rounded-lg focus:border-cyan-500 transition-colors">
                             <option>Buy Dominan (Hajar Kanan)</option>
                             <option>Sell Dominan (Hajar Kiri)</option>
                             <option>Netral / Sepi</option>
                           </select>
                         </div>
                      </div>
                   </div>

                   <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl space-y-6">
                      <div className="flex justify-between items-center">
                         <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Broker Summary</h3>
                         <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${analisaInput.brokerSummaryVal > 60 ? 'bg-emerald-500/20 text-emerald-400' : analisaInput.brokerSummaryVal < 40 ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-400'}`}>{analisaInput.brokerSummaryVal > 60 ? 'BIG ACC' : analisaInput.brokerSummaryVal < 40 ? 'BIG DIST' : 'NETRAL'}</span>
                      </div>
                      <div className="relative pt-6 pb-2">
                         <input type="range" min="0" max="100" value={analisaInput.brokerSummaryVal} onChange={(e)=>setAnalisaInput({...analisaInput, brokerSummaryVal: parseInt(e.target.value)})} className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                         <div className="flex justify-between text-[8px] text-slate-500 font-bold mt-2 uppercase">
                            <span>Big Dist</span>
                            <span>Netral</span>
                            <span>Big Acc</span>
                         </div>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500 uppercase font-bold block mb-2">Top 3 Broker Codes</label>
                        <input type="text" value={analisaInput.topBrokers} onChange={(e)=>handleBrokerChange(e.target.value)} className="w-full bg-black border border-white/10 p-3 text-white font-mono uppercase text-[11px] outline-none rounded-lg focus:border-cyan-500" placeholder="YP, BK, MS" />
                        <div className="flex flex-wrap gap-2 mt-3">
                           {brokerFeedback.map((f, i) => {
                              const parts = f.split(':');
                              const type = parts.length > 1 ? parts[1].trim() : 'UNKNOWN';
                              const color = type === 'RICH' ? 'text-emerald-400 bg-emerald-900/30 border-emerald-500/30' : type === 'KONGLO' ? 'text-amber-400 bg-amber-900/30 border-amber-500/30' : type === 'RITEL' ? 'text-rose-400 bg-rose-900/30 border-rose-500/30' : 'text-slate-400 bg-slate-800/50 border-slate-600/30';
                              return <span key={i} className={`text-[8px] border px-2 py-1 rounded font-bold uppercase ${color}`}>{f}</span>;
                           })}
                        </div>
                      </div>
                   </div>

                   <div className="bg-white/[0.03] border border-white/10 p-6 rounded-2xl space-y-6">
                      <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                         <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Intelligence Feed (AI)
                      </h3>
                      <div className="space-y-2">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block">Raw Context Input</label>
                        <textarea 
                           value={analisaInput.rawIntelligenceData} 
                           onChange={(e) => setAnalisaInput({...analisaInput, rawIntelligenceData: e.target.value})}
                           placeholder="Paste Fundamental, Historis, Technical, atau Monte Carlo data di sini..."
                           className="w-full h-40 bg-black border border-white/10 p-3 text-white font-mono text-[10px] outline-none rounded-lg focus:border-cyan-500 custom-scrollbar resize-none placeholder:text-slate-800"
                        />
                      </div>
                   </div>

                   <button onClick={handleDeepAnalisa} disabled={isAnalisaLoading} className={`w-full py-6 font-black text-[12px] uppercase tracking-[0.4em] transition-all rounded-xl relative overflow-hidden group ${publicData ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)]' : 'bg-white/5 text-slate-600'}`}>
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                      <span className="relative z-10">{isAnalisaLoading ? 'PROCESSING...' : 'INITIATE FUSION ANALYSIS'}</span>
                   </button>
                </div>

                <div className="space-y-6">
                   {publicData && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-500">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                           <span className="text-[8px] text-slate-500 uppercase block mb-1">Foreign Flow</span>
                           <span className="text-[11px] font-mono text-emerald-400">{publicData.marketData?.foreignFlow || '-'}</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                           <span className="text-[8px] text-slate-500 uppercase block mb-1">Investor ID</span>
                           <span className="text-[11px] font-mono text-white">{publicData.kseiStats?.sidCount || '-'}</span>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5 col-span-2">
                           <span className="text-[8px] text-slate-500 uppercase block mb-1">Management Key</span>
                           <span className="text-[10px] text-slate-300 truncate block">{publicData.management?.presDir || '-'}</span>
                        </div>
                      </div>
                   )}

                   <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-3xl p-8 relative min-h-[500px]">
                      {deepResult ? (
                        <div className="space-y-10 animate-in zoom-in-95 duration-500 pb-12">
                           <div className="flex justify-between items-start border-b border-white/10 pb-6">
                              <div className="flex-1">
                                 <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-black uppercase tracking-widest rounded-full mb-3 inline-block">AI Intelligence Fusion Verdict</span>
                                 <h2 className="text-4xl lg:text-5xl font-black text-white uppercase leading-none mt-2">{deepResult.strategyType}</h2>
                              </div>
                              <div className="flex flex-col items-end gap-3 ml-4">
                                 <div className="text-right">
                                    <span className="text-[9px] text-slate-500 uppercase tracking-widest block mb-1">Risk Level</span>
                                    <span className={`text-2xl font-black uppercase ${deepResult.riskLevel?.toLowerCase().includes('high') || deepResult.riskLevel?.toLowerCase().includes('extreme') ? 'text-rose-500' : 'text-emerald-500'}`}>{deepResult.riskLevel}</span>
                                 </div>
                                 <button 
                                    onClick={handleCopyConclusion}
                                    className={`px-4 py-2 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${isCopied ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'}`}
                                 >
                                    {isCopied ? 'COPIED!' : 'SALIN KESIMPULAN'}
                                 </button>
                              </div>
                           </div>

                           <div className="bg-gradient-to-r from-cyan-900/10 to-transparent border-l-4 border-cyan-500 p-6">
                              <span className="text-[9px] font-black text-cyan-500/70 uppercase tracking-widest block mb-2">Market Prediction</span>
                              <p className="text-xl text-cyan-100 font-medium leading-relaxed italic">"{deepResult.prediction}"</p>
                           </div>

                           {/* Detailed Analysis Section (SUITABILITY) */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3">
                                 <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Jangka Panjang Analysis
                                 </h4>
                                 <p className="text-[13px] text-slate-300 leading-relaxed italic text-justify">{deepResult.longTermSuitability}</p>
                              </div>
                              <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl space-y-3">
                                 <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Jangka Pendek Analysis
                                 </h4>
                                 <p className="text-[13px] text-slate-300 leading-relaxed italic text-justify">{deepResult.shortTermSuitability}</p>
                              </div>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-emerald-900/10 border border-emerald-500/20 p-5 rounded-2xl text-center">
                                 <span className="text-[9px] text-emerald-500/70 uppercase font-black tracking-widest block mb-2">Entry Zone</span>
                                 <span className="text-2xl font-mono font-bold text-emerald-400">{deepResult.entryArea}</span>
                              </div>
                              <div className="bg-cyan-900/10 border border-cyan-500/20 p-5 rounded-2xl text-center">
                                 <span className="text-[9px] text-cyan-500/70 uppercase font-black tracking-widest block mb-2">Target Price</span>
                                 <span className="text-2xl font-mono font-bold text-cyan-400">{deepResult.targetPrice}</span>
                              </div>
                              <div className="bg-rose-900/10 border border-rose-500/20 p-5 rounded-2xl text-center">
                                 <span className="text-[9px] text-rose-500/70 uppercase font-black tracking-widest block mb-2">Stop Loss</span>
                                 <span className="text-2xl font-mono font-bold text-rose-400">{deepResult.stopLoss}</span>
                              </div>
                           </div>

                           <div className="space-y-4">
                              <h4 className="text-[10px] font-black text-white uppercase tracking-widest border-b border-white/5 pb-2">Reasoning & Telemetry Fusion</h4>
                              <ul className="space-y-3">
                                 {deepResult.reasoning?.map((r, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-slate-300 items-start">
                                       <span className="text-cyan-500 mt-1 flex-shrink-0 font-bold">»</span>
                                       <span className="text-slate-400">{r}</span>
                                    </li>
                                 ))}
                              </ul>
                           </div>
                           <div className="pt-6 border-t border-white/5">
                              <p className="text-[9px] font-mono text-slate-600 text-center uppercase tracking-[0.2em] italic">{deepResult.dynamicDisclaimer}</p>
                           </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                           <div className="w-32 h-32 border border-white/20 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                              <div className="w-24 h-24 border border-cyan-500/30 rounded-full border-t-transparent animate-[spin_3s_linear_infinite_reverse]"></div>
                           </div>
                           <p className="mt-6 text-[10px] font-mono text-white tracking-[0.4em] uppercase">AWAITING TELEMETRY FUSION DATA</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
