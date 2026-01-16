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

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
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
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
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
    BERTINDAK SEBAGAI: Senior Intelligence Fusion Analyst ArthaVision 2026.
    
    PROTOKOL: DATA FUSION V4.0 (WAJIB EKSTRAKSI DATA MENTAH).
    
    INSTRUKSI UTAMA:
    Anda diberikan data mentah (Raw Context) di 'Intelligence Feed'. Data ini berisi section:
    - Data Fundamental (PE, EPS, PEG)
    - Stats Matematis (Sharpe Ratio, Volatility, Skewness, Kurtosis)
    - Technical Indicators (RSI, MACD, Bollinger, MA Crossovers)
    - Monte Carlo Simulasi (Mean Harga 1 Tahun, VaR 95%, CVaR)

    TUGAS ANDA:
    1. EKSTRAKSI WAJIB: Baca angka Sharpe Ratio, VaR 95%, dan Mean Harga Monte Carlo. Gunakan angka ini sebagai basis target harga Anda.
    2. KORELASI SILANG: Bandingkan target matematis dari feed dengan aksi Bandar (Order Book, Broker Summary) yang diinput user. 
       - Jika Monte Carlo > Harga Sekarang tapi Broker Summary menunjukkan "Big Distribution", simpulkan sebagai risiko "Exit Liquidity".
       - Jika RSI menunjukkan Oversold tapi Bandarmology menunjukkan "Big Accumulation", simpulkan sebagai "Prime Entry Point".
    3. JANGAN mengabaikan text area. Gunakan data tersebut untuk menjawab pertanyaan "Apakah cocok untuk jangka panjang/pendek?".

    DATA INPUT USER:
    - Saham: ${input.stockCode}
    - Harga: ${input.price}
    - Avg Price Top 3 Bandar: ${input.avgPriceTop3}
    - Posisi vs Bandar: ${brokerPosition} (${priceDiff.toFixed(2)}%)
    - Order Book: ${input.orderBookStatus}
    - Trade Book: ${input.tradeBookStatus}
    - Broker Summary (0-100): ${input.brokerSummaryVal}
    
    INTELLIGENCE FEED (DATA MENTAH - ANALISIS SEMUA POIN DI SINI):
    ${input.rawIntelligenceData || "TIDAK ADA DATA FEED."}
    
    OUTPUT REQUIREMENTS (BAHASA INDONESIA FORMAL & TAJAM):
    - marketStructure: Analisis detail struktur harga saat ini.
    - prediction: Prediksi arah harga 1-5 hari ke depan.
    - strategyType: Keputusan tegas (Scalping/Swing/Invest/Avoid).
    - entryArea, targetPrice, stopLoss: Berikan angka spesifik.
    - riskLevel: Low/Med/High/Extreme.
    - longTermSuitability: Minimal 3 kalimat. Hubungkan dengan data Fundamental & Monte Carlo di feed.
    - shortTermSuitability: Minimal 3 kalimat. Hubungkan dengan Bandarmology & Technicals di feed.
    - reasoning: List 5-7 poin fusion yang menggabungkan angka matematis feed dan psikologi bandar.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: { 
      thinkingConfig: { thinkingBudget: 32768 }, 
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