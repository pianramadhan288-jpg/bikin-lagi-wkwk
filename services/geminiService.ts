import { GoogleGenAI, Type } from "@google/genai";
import { StockMetrics, AnalisaInput, DeepAnalysisResult, PublicCompanyData, AIAnalysisResult } from "../types";

// Fungsi pembersih JSON yang kuat
const cleanJson = (text: string): string => {
  if (!text) return "{}";
  // Hapus markdown code blocks ```json dan ```
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return cleaned;
};

// Helper untuk inisialisasi AI hanya saat dibutuhkan (Lazy Load)
// Ini mencegah "White/Black Screen of Death" saat website baru dibuka
const getAI = () => {
  // process.env.API_KEY ini akan diganti oleh Vite saat build menjadi string asli
  const key = process.env.API_KEY as string;
  
  if (!key || key.trim() === "" || key.includes("undefined")) {
    throw new Error("API Key belum terdeteksi. Pastikan sudah input API_KEY di Settings Vercel dan lakukan REDEPLOY (Bukan cuma refresh).");
  }
  
  return new GoogleGenAI({ apiKey: key });
};

export const analyzeFundamentalAI = async (metrics: StockMetrics): Promise<AIAnalysisResult> => {
  const ai = getAI(); // Inisialisasi di sini

  const prompt = `
    IDENTITAS:
ArthaVision Core v2.3 – Senior Fundamental Analyst & Financial Forensic Specialist.
Fokus pada kualitas laba, daya tahan bisnis, dan kegagalan investasi (failure modes).
TUJUAN ANALISIS:
Melakukan analisis mendalam laporan keuangan emiten IDX untuk menilai kelayakan investasi berbasis data, dengan prioritas pada risk of capital loss, bukan optimisme harga.
PRINSIP WAJIB
Analisis HARUS skeptis, berbasis data, dan bebas bias bullish/bearish.
Valuasi murah TIDAK otomatis layak investasi.
Profit tinggi TIDAK otomatis berkualitas.
Jika data saling bertentangan → prioritaskan sinyal risiko.
LOGIKA ANALISIS WAJIB (TIDAK BOLEH DILEWATI)
1. PROFITABILITAS & STRUKTUR LABA (DU PONT + QUALITY CHECK)
Bedah ROE ${metrics.roe}% dan ROA ${metrics.roa}% menggunakan pendekatan Du Pont.
Evaluasi apakah ROE didorong oleh:
efisiensi operasional,
leverage,
atau ekspansi aset.
Analisis NPM ${metrics.npm}%:
bandingkan dengan ROA untuk mendeteksi margin semu.
Jika ROE tinggi tetapi ROA stagnan dan DER meningkat → klasifikasikan sebagai ROE berbasis leverage.
2. KUALITAS LABA & FORENSIC CASH FLOW (KRITIS)
Evaluasi CFO ${metrics.cfo}B dan FCF ${metrics.fcf}B.
Bandingkan:
pertumbuhan Net Profit vs CFO.
Jika laba tumbuh namun CFO stagnan/menurun → indikasi earnings quality lemah.
Jika FCF > Net Profit → kualitas laba sangat kuat.
Jika FCF negatif namun laba positif → jelaskan sumber risiko dan keberlanjutan.
3. SOLVABILITAS & RISIKO STRUKTURAL
Analisis DER ${metrics.derInput}x sebagai batas keamanan leverage.
Evaluasi kemampuan perusahaan membayar kewajiban tanpa mengorbankan operasi inti.
Jika Current Ratio rendah dan DER tinggi → nyatakan risiko gagal bayar implisit.
4. VALUASI & MARGIN OF SAFETY (ANTI VALUE TRAP)
Evaluasi PBV ${metrics.pbvInput}x dan PE ${metrics.peInput}x.
Tentukan apakah valuasi rendah disebabkan:
mispricing pasar, atau
penurunan kualitas fundamental.
Valuasi murah tanpa dukungan cash flow & profitabilitas → value trap.
5. PERTUMBUHAN & KEBERLANJUTAN
Hitung YoY Revenue Growth:
${(((metrics.revNow - metrics.revLastYear)/metrics.revLastYear)*100).toFixed(2)}%
Evaluasi apakah pertumbuhan:
organik,
berbasis efisiensi,
atau berbasis utang.
Jika pertumbuhan tinggi tetapi margin dan CFO melemah → pertumbuhan berisiko.
6. NORMALISASI SEKTOR (WAJIB)
Bandingkan ROE, NPM, PBV, dan PE terhadap rata-rata 3–5 emiten sejenis.
Tentukan:
apakah perusahaan superior secara kualitas,
atau hanya murah karena kualitas di bawah sektor.
7. CAPITAL ALLOCATION & DIVIDEND REALISM
Evaluasi apakah dividen (jika ada) dibayar dari:
CFO sehat, atau
pengurasan kas / leverage.
Jika dividend yield tinggi tetapi FCF negatif → indikasi yield trap.
8. FAILURE MODE & MONITORING CONDITIONS (WAJIB)
Analisa ini DIANGGAP GAGAL jika terjadi salah satu kondisi berikut:
CFO menurun selama ≥2 periode berturut-turut.
Margin turun meskipun revenue meningkat.
DER meningkat bersamaan dengan penurunan ROA.
FCF negatif berkelanjutan tanpa ekspansi produktif yang jelas.
Berikan parameter apa yang HARUS DIPANTAU ke depan agar risiko kerugian besar dapat dihindari.
OUTPUT REQUIREMENTS (WAJIB)
JANGKA PANJANG:
Analisis moat, daya tahan bisnis, efisiensi modal, dan risiko struktural.
JANGKA MENENGAH:
Evaluasi apakah fundamental mendukung akumulasi bertahap atau wait-and-see.
VERDICT (TEGAS):
INVESTASI NILAI / INVESTASI BERSYARAT / SPEKULATIF / HINDARI.
FUNDAMENTAL SCORE:
Skor 0–100 berdasarkan bobot:
Profitability
Cash Flow Quality
Solvency
Valuation
Growth Sustainability
ACCURACY MATRIX:
Breakdown skor tiap pilar (0–100) + catatan risiko utama.
GAYA BAHASA:
Bahasa Indonesia institusional, tajam, skeptis, objektif.
Dilarang memberikan rekomendasi emosional atau simplifikasi ritel.
  `;

  // GANTI MODEL KE FLASH (Lebih Aman Kuota)
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 16000 }, // Budget disesuaikan untuk Flash
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          executiveSummary: { type: Type.STRING },
          longTermInsight: { type: Type.STRING },
          shortTermInsight: { type: Type.STRING },
          verdict: { type: Type.STRING },
          fundamentalScore: { type: Type.NUMBER },
          recommendation: { type: Type.STRING },
          riskAnalysis: { type: Type.ARRAY, items: { type: Type.STRING } },
          competitiveMoat: { type: Type.STRING },
          accuracyMatrix: {
            type: Type.OBJECT,
            properties: {
              profitabilityQuality: { type: Type.NUMBER },
              solvencyRisk: { type: Type.NUMBER },
              valuationMargin: { type: Type.NUMBER },
              cashFlowIntegrity: { type: Type.NUMBER }
            }
          }
        }
      }
    }
  });

  const text = cleanJson(response.text || "{}");
  try {
    return JSON.parse(text) as AIAnalysisResult;
  } catch (e) {
    console.error("JSON Parse Error (Fundamental):", text);
    throw new Error("Gagal memproses data AI (Format Invalid).");
  }
};

export const fetchPublicStockData = async (stockCode: string): Promise<PublicCompanyData> => {
  const ai = getAI(); // Inisialisasi di sini

  const prompt = `Cari data resmi TERBARU TAHUN 2026 untuk emiten: ${stockCode} di Bursa Efek Indonesia (IDX). Wajib sertakan Manajemen (Presdir, Direksi, Komisaris), Corporate Action, dan Statistik KSEI.`;
  // GANTI MODEL KE FLASH
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  
  const text = cleanJson(response.text || "{}");
  try {
    return JSON.parse(text) as PublicCompanyData;
  } catch (e) {
    console.error("JSON Parse Error (Public Data):", text);
    throw new Error("Gagal mengambil data publik.");
  }
};

export const runDeepAnalisa = async (input: AnalisaInput): Promise<DeepAnalysisResult> => {
  const ai = getAI(); // Inisialisasi di sini

  const priceDiff = input.avgPriceTop3 > 0 
    ? ((input.price - input.avgPriceTop3) / input.avgPriceTop3) * 100 
    : 0;
  
  const brokerPosition = priceDiff < -2 ? "AKUMULASI (Harga Jauh Dibawah Avg Broker)" 
    : priceDiff > 2 ? "DISTRIBUSI (Harga Jauh Diatas Avg Broker)" 
    : "NETRAL (Harga Dekat Avg Broker)";

  const prompt = `
    BERTINDAK SEBAGAI
Senior Intelligence Fusion Analyst — Ve'Larc 2026
Spesialis probabilistic decision-making, tail-risk management, dan behavioral market structure.
Tujuan utama: mengukur peluang, mendeteksi kegagalan, dan menjaga disiplin risiko, bukan membenarkan bias bullish atau bearish.

PRINSIP INTI (WAJIB DITAATI)
Analisa bersifat probabilistik, bukan prediksi pasti.
Risk signal SELALU lebih prioritas daripada ekspektasi return.
Data > Narasi. Angka > Opini.
Analisa tidak berhenti di satu output — pasar dinamis, maka evaluasi harus berlapis.
DATA FUSION PROTOCOL
VERSION: V4.3 — PROBABILITY, TAIL RISK & MONITORING FIRST
INSTRUKSI UTAMA
Anda diberikan Raw Intelligence Feed yang berisi:
Data Fundamental
Statistik Matematis
Technical Indicators
Monte Carlo Simulation
Bandarmology & Order Flow
Semua kesimpulan WAJIB diturunkan dari data eksplisit di feed.
Jika terjadi konflik antar data → prioritaskan sinyal risiko.
TUGAS ANALISIS WAJIB
1. DATA EXTRACTION & REALITY CHECK (WAJIB)
Ekstrak dan gunakan secara eksplisit:
Sharpe Ratio
VaR 95%
CVaR (jika tersedia)
Mean Harga Monte Carlo 1 Tahun
Skewness
Kurtosis
⚠️ Larangan keras:
Mean Monte Carlo BUKAN target harga pasti
Gunakan hanya sebagai ekspektasi matematis, bukan kepastian arah
2. DISTRIBUTION & TAIL RISK ANALYSIS
Analisa bentuk distribusi return:
Normal / Skewed / Heavy-tailed
Jika Kurtosis > 6:
Nyatakan eksplisit adanya Fat Tail Risk
Jelaskan implikasinya terhadap:
Entry discipline
Stop loss placement
Holding period
3. PROBABILITY-BASED TARGETING (ANTI SINGLE TARGET)
❌ DILARANG memberikan satu target harga tunggal.
WAJIB klasifikasikan:
High Probability Zone (Q50–Q65) → target utama
Bull Scenario (Q80–Q90) → tail kanan / bonus
Risk Scenario (VaR / CVaR) → downside realistis
Sertakan penilaian probabilitas relatif (rendah / sedang / tinggi).
4. BANDARMology & ORDER FLOW VALIDATION
Korelasikan hasil matematis dengan perilaku bandar:
Jika Monte Carlo > Harga Sekarang
DAN Broker Summary = Big Distribution
→ klasifikasikan sebagai Exit Liquidity Risk
Jika RSI Oversold
DAN Big Accumulation terdeteksi
→ klasifikasikan sebagai Asymmetric Entry Opportunity
Evaluasi:
Bid tebal = absorpsi nyata atau ilusi?
Kenaikan harga divalidasi volume atau tidak?
5. TIMEFRAME SUITABILITY TEST
Gunakan seluruh data untuk menjawab secara tegas:
Layak jangka pendek?
Layak swing?
Layak jangka panjang?
Atau HARUS DIHINDARI?
⚠️ Valuasi murah BUKAN alasan otomatis jangka panjang.
6. FAILURE CONDITIONS (WAJIB — TANPA INI ANALISA TIDAK VALID)
Tuliskan secara eksplisit:
“Analisa ini dianggap gagal jika …”
Contoh:
Breakdown level statistik penting dengan volume tinggi
Top broker beralih menjadi net seller
Pelanggaran VaR terjadi lebih cepat dari ekspektasi simulasi
7. CONTINUOUS INTELLIGENCE MONITORING (WAJIB)
Analisa TIDAK berhenti pada satu output.
WAJIB definisikan parameter pantauan aktif:
A. Market Health Monitoring
Pantau perubahan:
Sharpe Ratio (Δ Sharpe)
VaR 95% (risk expanding / contracting)
Skewness (bullish → bearish shift)
Klasifikasi status:
Stable
Deteriorating
Critical
B. Behavioral Shift Detection
Pantau:
Perubahan perilaku top broker (net buy → net sell)
Harga naik tapi volume melemah
Order book holding vs absorption
Jika terdeteksi → turunkan confidence satu tingkat.
C. Monte Carlo Deviation Watch
Pantau deviasi harga aktual terhadap:
Q50
Q65
VaR boundary
Jika harga bergerak menuju tail kiri lebih cepat dari simulasi:
→ nyatakan Model Stress / Breakdown Risk.
D. THESIS STATUS (WAJIB OUTPUT)
Setiap analisa HARUS memilih satu:
Thesis Valid
Thesis Weakened
Thesis Invalidated
Tanpa ini → analisa dianggap tidak lengkap.
E. ACTION DISCIPLINE (BUKAN BUY/SELL)
Thesis Valid → pertahankan eksposur
Thesis Weakened → kurangi risiko / perketat kontrol
Thesis Invalidated → exit berbasis data, bukan emosi
DATA INPUT USER (JANGAN DIUBAH)
Saham: ${input.stockCode}
Harga: ${input.price}
Avg Price Top 3 Bandar: ${input.avgPriceTop3}
Posisi vs Bandar: ${brokerPosition} (${priceDiff.toFixed(2)}%)
Order Book: ${input.orderBookStatus}
Trade Book: ${input.tradeBookStatus}
Broker Summary (0–100): ${input.brokerSummaryVal}
INTELLIGENCE FEED (DATA MENTAH — ANALISIS MENYELURUH)
${input.rawIntelligenceData || "TIDAK ADA DATA FEED."}
OUTPUT REQUIREMENTS
Gunakan Bahasa Indonesia formal, tajam, dan non-promosional.
WAJIB output:
marketStructure
prediction (1–5 hari + risiko koreksi)
strategyType (Scalping / Swing / Invest / Avoid)
entryArea (berbasis probabilitas, bukan harga ideal)
targetPrice (pisahkan target utama & bull scenario)
stopLoss (selaras VaR / tail risk)
riskLevel (Low / Medium / High / Extreme)
longTermSuitability (≥3 kalimat)
shortTermSuitability (≥3 kalimat)
thesisStatus (Valid / Weakened / Invalidated)
monitoringNotes (apa yang HARUS dipantau selanjutnya)
reasoning (5–7 poin, tiap poin gabungkan angka + perilaku bandar)
PRINSIP PENUTUP
Analisa ini adalah alat berpikir probabilistik, bukan mesin kepastian.
Keunggulan datang bukan dari benar terus, tetapi dari tahu lebih cepat saat salah.
  `;

  // GANTI MODEL KE FLASH (Lebih Aman Kuota)
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { 
      thinkingConfig: { thinkingBudget: 16000 }, // Budget disesuaikan untuk Flash
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          marketStructure: { type: Type.STRING },
          prediction: { type: Type.STRING },
          strategyType: { type: Type.STRING },
          entryArea: { type: Type.STRING },
          targetPrice: { type: Type.STRING },
          stopLoss: { type: Type.STRING },
          riskLevel: { type: Type.STRING },
          longTermSuitability: { type: Type.STRING },
          shortTermSuitability: { type: Type.STRING },
          reasoning: { type: Type.ARRAY, items: { type: Type.STRING } },
          dynamicDisclaimer: { type: Type.STRING }
        }
      }
    }
  });
  
  const text = cleanJson(response.text || "{}");
  try {
    return JSON.parse(text) as DeepAnalysisResult;
  } catch (e) {
    console.error("JSON Parse Error (Deep Analysis):", text);
    throw new Error("Gagal memproses hasil analisa AI (Format Invalid).");
  }
};
