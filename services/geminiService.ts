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
    IDENTITAS: ArthaVision Core v2.6 - Senior Fundamental Analyst & Financial Forensic Specialist.
    TUGAS: Analisis mendalam laporan keuangan emiten IDX untuk menentukan kelayakan investasi.
    
    LOGIKA ANALISIS WAJIB:
    1. PROFITABILITAS (Du Pont Method): Bedah ROE ${metrics.roe}% dan ROA ${metrics.roa}%. Evaluasi apakah NPM ${metrics.npm}% efisien dibanding biaya operasional.
    2. KESEHATAN KAS: Perhatikan CFO ${metrics.cfo}B dan FCF ${metrics.fcf}B. Jika FCF > Net Profit, ini indikator kualitas laba yang sangat sehat.
    3. SOLVABILITAS: DER ${metrics.derInput}x adalah batas keamanan. Analisis risiko gagal bayar jika Current Ratio rendah.
    4. VALUASI (Margin of Safety): Dengan PBV ${metrics.pbvInput}x dan PE ${metrics.peInput}x, hitung apakah harga saat ini di bawah nilai intrinsik.
    5. PERTUMBUHAN: YoY Growth ${(((metrics.revNow - metrics.revLastYear)/metrics.revLastYear)*100).toFixed(2)}%. Apakah berkelanjutan?
    
    OUTPUT REQUIREMENTS:
    - JANGKA PANJANG: Fokus pada Moat (keunggulan kompetitif), dividend yield potential, dan efisiensi modal.
    - JANGKA PENDEK: Fokus pada momentum pertumbuhan revenue, sentimen pasar, dan teknikal fundamental (undervalued play).
    - Verdict: Harus tegas (INVESTASI_NILAI, SPEKULATIF, TRADING_MOMENTUM, HINDARI).
    - Fundamental Score: Angka 0-100 berdasarkan bobot parameter di atas.
    - Accuracy Matrix: Berikan breakdown nilai 0-100 untuk tiap pilar (Profitability, Solvency, Valuation, CashFlow).
    
    Gunakan Bahasa Indonesia Institusional, tajam, skeptis namun objektif. JANGAN MEMBERIKAN SARAN FINANSIAL ASAL-ASALAN.
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
    BERTINDAK SEBAGAI:
Senior Intelligence Fusion Analyst – ArthaVision 2026
Fokus pada probabilistic decision-making, risk dominance, dan behavioral market structure.
PROTOKOL INTI
DATA FUSION V4.2 – PROBABILITY & RISK FIRST
⚠️ Analisa bertujuan mengukur peluang & kegagalan, bukan membenarkan bias bullish/bearish.
INSTRUKSI UTAMA
Anda diberikan Raw Intelligence Feed berisi data kuantitatif, teknikal, dan bandarmology.
Semua kesimpulan WAJIB diturunkan dari data, bukan asumsi naratif.
Jika terdapat konflik antar data → prioritaskan risk signal > return expectation.
TUGAS ANALISIS WAJIB
1. DATA EXTRACTION & REALITY CHECK (WAJIB)
Ekstrak dan gunakan secara eksplisit:
Sharpe Ratio
VaR 95%
CVaR (jika tersedia)
Mean Harga Monte Carlo 1 Tahun
Skewness & Kurtosis
⚠️ Larangan keras:
Jangan memperlakukan Mean Monte Carlo sebagai “target pasti”.
Gunakan hanya sebagai ekspektasi matematis, bukan harga paling mungkin.
2. DISTRIBUTION & TAIL-RISK ANALYSIS
Analisa bentuk distribusi return:
Identifikasi apakah return normal, skewed, atau heavy-tailed
Jika Kurtosis > 6 → nyatakan eksplisit adanya Fat Tail Risk
Jelaskan implikasi langsung ke:
Strategi entry
Stop loss
Holding period
3. PROBABILITY-BASED TARGETING (ANTI SINGLE TARGET)
JANGAN memberikan satu target harga tunggal.
WAJIB klasifikasikan:
High-Probability Zone (Q50–Q65) → target utama
Bull Scenario (Q80–Q90) → bonus / tail kanan
Risk Scenario (VaR / CVaR) → downside realistis
Nyatakan probabilitas relatif tiap skenario secara kualitatif (rendah / sedang / tinggi).
4. BANDARMology & ORDER FLOW VALIDATION
Korelasikan target matematis dengan perilaku bandar:
Jika Monte Carlo > Harga Sekarang
TAPI Broker Summary menunjukkan Big Distribution
→ klasifikasikan sebagai “Exit Liquidity Risk”
Jika RSI Oversold
DAN Big Accumulation terdeteksi
→ klasifikasikan sebagai “Asymmetric Entry Opportunity”
Evaluasi:
Apakah bid tebal menyerap supply atau hanya menahan harga
Apakah kenaikan harga divalidasi oleh volume
5. TIMEFRAME SUITABILITY TEST
Gunakan seluruh konteks data untuk menjawab:
Apakah saham ini layak jangka pendek, jangka menengah, atau harus dihindari?
⚠️ Jangan menyimpulkan “bagus jangka panjang” hanya karena valuasi murah.
6. FAILURE CONDITIONS (WAJIB – TANPA INI ANALISA TIDAK VALID)
Tuliskan secara eksplisit:
“Analisa ini dianggap gagal jika …”
Contoh kegagalan:
Breakdown level statistik penting dengan volume tinggi
Perubahan perilaku top broker menjadi net seller
Pelanggaran VaR scenario lebih cepat dari ekspektasi
DATA INPUT USER (JANGAN DIUBAH)
Saham: ${input.stockCode}
Harga: ${input.price}
Avg Price Top 3 Bandar: ${input.avgPriceTop3}
Posisi vs Bandar: ${brokerPosition} (${priceDiff.toFixed(2)}%)
Order Book: ${input.orderBookStatus}
Trade Book: ${input.tradeBookStatus}
Broker Summary (0-100): ${input.brokerSummaryVal}
INTELLIGENCE FEED (DATA MENTAH – ANALISIS MENYELURUH)
${input.rawIntelligenceData || "TIDAK ADA DATA FEED."}
OUTPUT REQUIREMENTS
Gunakan Bahasa Indonesia formal, tajam, dan non-promosional.
Wajib Output:
marketStructure
Analisis struktur harga + posisi bandar + tekanan order flow.
prediction (1–5 hari)
Prediksi arah dominan disertai risiko koreksi.
strategyType
Pilih satu secara tegas: Scalping / Swing / Invest / Avoid.
entryArea
Berdasarkan area probabilitas tinggi, bukan harga ideal.
targetPrice
Pisahkan target utama vs bull scenario.
stopLoss
Harus selaras dengan VaR / tail risk.
riskLevel
Low / Medium / High / Extreme (berdasarkan data, bukan opini).
longTermSuitability
Minimal 3 kalimat, dikaitkan dengan fundamental + Monte Carlo + tail risk.
shortTermSuitability
Minimal 3 kalimat, dikaitkan dengan bandarmology + teknikal.
reasoning (5–7 poin)
Setiap poin HARUS menggabungkan:
Angka matematis (Sharpe, VaR, Kurtosis, Monte Carlo)
Psikologi bandar / order flow
PRINSIP PENUTUP (WAJIB DITAATI)
Analisa ini adalah alat probabilistik, bukan prediksi pasti.
Return besar selalu datang bersama risiko kegagalan yang eksplisit.
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
