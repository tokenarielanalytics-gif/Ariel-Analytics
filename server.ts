import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

// Initialize Firebase Admin
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId,
  });
} else {
  console.warn("Firebase config not found. Admin SDK not initialized.");
}

const db = admin.apps.length ? admin.firestore(JSON.parse(fs.readFileSync(configPath, 'utf8')).firestoreDatabaseId) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Crypto API Proxy Routes
  app.get("/api/crypto/dexscreener/search", async (req, res) => {
    try {
      const { q } = req.query;
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=${q}`);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch from Dexscreener" });
    }
  });

  app.get("/api/crypto/dexscreener/latest", async (req, res) => {
    try {
      const response = await axios.get("https://api.dexscreener.com/token-profiles/latest/v1");
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest tokens" });
    }
  });

  // Usage Limit Middleware
  const checkUsageLimit = async (req: any, res: any, next: any) => {
    if (!db) return next();

    try {
      const userId = req.user.uid;
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        // If user doesn't exist in Firestore yet, we treat as a new FREE user
        return next();
      }
      
      const userData = userDoc.data();
      const userPlan = userData?.plan || "FREE";
      const userUsage = userData?.analysesCount || 0;

      const limits: any = {
        FREE: 5,
        PRO: 50,
        PREMIUM: 200
      };

      if (userUsage >= limits[userPlan]) {
        return res.status(403).json({ error: "Usage limit reached for your plan" });
      }
      next();
    } catch (error: any) {
      console.error("[UsageLimit] Error checking usage:", error.message);
      // If we can't check usage, we allow it for now to avoid blocking the user
      next();
    }
  };

  // Technical Indicators Logic (REAL)
  const calculateRSI = (prices: number[], period: number = 14) => {
    if (prices.length <= period) return 50;
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    for (let i = period + 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      let gain = 0;
      let loss = 0;
      if (diff >= 0) gain = diff;
      else loss = -diff;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  };

  const calculateEMA = (prices: number[], period: number) => {
    if (prices.length < period) return prices[prices.length - 1];
    const k = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * k + ema;
    }
    return ema;
  };

  const calculateMACD = (prices: number[]) => {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    return ema12 - ema26;
  };

  // Data Source Resolver (Professional Grade)
  const resolveDataSource = async (symbol: string) => {
    // Clean symbol: remove USDT, USDC, etc. to get the base token for better search
    const cleanSymbol = symbol.toUpperCase().replace(/(USDT|USDC|BUSD|DAI|USD)$/, "").trim();
    
    if (!cleanSymbol) {
      throw new Error("Símbolo de token inválido.");
    }
    
    console.log(`[DataSourceResolver] Resolving source for: ${cleanSymbol} (original: ${symbol})`);
    
    try {
      // 1. Search Dexscreener for the most reliable pool
      // Try searching with the cleaned symbol first
      let dexResponse = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=${cleanSymbol}`, { timeout: 5000 });
      let pairs = dexResponse.data.pairs;
      
      // If no pairs found with clean symbol, try with original symbol
      if (!pairs || pairs.length === 0) {
        dexResponse = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=${symbol}`, { timeout: 5000 });
        pairs = dexResponse.data.pairs;
      }
      
      if (!pairs || pairs.length === 0) {
        throw new Error("Token não encontrado em nenhuma DEX monitorada.");
      }

      // 2. Selection Logic: Highest Liquidity + Volume
      // We filter out pools with very low liquidity to avoid "ghost" pairs
      // Threshold is $100 to be inclusive for newer/smaller tokens
      const validPairs = (pairs || []).filter((p: any) => (p.liquidity?.usd || 0) > 100);
      
      if (validPairs.length === 0) {
        // If we found pairs but none have > $100 liquidity, we report it
        throw new Error("Liquidez insuficiente para análise técnica confiável.");
      }

      const bestPair = validPairs.sort((a: any, b: any) => {
        const scoreA = (a.liquidity?.usd || 0) * 0.7 + (a.volume?.h24 || 0) * 0.3;
        const scoreB = (b.liquidity?.usd || 0) * 0.7 + (b.volume?.h24 || 0) * 0.3;
        return scoreB - scoreA;
      })[0];

      console.log(`[DataSourceResolver] Selected Pool: ${bestPair.pairAddress} on ${bestPair.chainId} (${bestPair.dexId})`);
      
      return {
        symbol: bestPair.baseToken?.symbol || symbol.toUpperCase(),
        name: bestPair.baseToken?.name || symbol.toUpperCase(),
        chainId: bestPair.chainId,
        pairAddress: bestPair.pairAddress,
        dexId: bestPair.dexId,
        url: bestPair.url,
        liquidity: bestPair.liquidity?.usd || 0,
        volume24h: bestPair.volume?.h24 || 0
      };
    } catch (error: any) {
      console.error(`[DataSourceResolver] Error: ${error.message}`);
      throw error;
    }
  };

  // Analysis Engine (UNIFIED SINGLE SOURCE OF TRUTH)
  app.get("/api/crypto/analyze", authenticate, checkUsageLimit, async (req: any, res) => {
    try {
      const { symbol } = req.query;
      if (!symbol) return res.status(400).json({ error: "Symbol is required" });

      // 1. Resolve the best pool (SSOT)
      const source = await resolveDataSource(symbol as string);

      // 2. Fetch OHLCV from GeckoTerminal for this EXACT pool
      const gtResponse = await axios.get(`https://api.geckoterminal.com/api/v2/networks/${source.chainId}/pools/${source.pairAddress}/ohlcv/hour?limit=200`, { timeout: 5000 });
      const ohlcvData = gtResponse.data.data.attributes.ohlcv_list;
      
      if (!ohlcvData || ohlcvData.length < 20) {
        return res.status(404).json({ 
          error: "Dados históricos insuficientes.",
          detail: "Este pool não possui histórico suficiente para cálculos de indicadores técnicos."
        });
      }

      // 3. Extract Synchronized Data
      // GeckoTerminal returns [timestamp, open, high, low, close, volume]
      const chronologicalData = [...ohlcvData].reverse();
      const closePrices = chronologicalData.map((d: any) => d[4]);
      const volumes = chronologicalData.map((d: any) => d[5]);
      
      // SSOT: Price is the last close of the dataset
      const currentPrice = closePrices[closePrices.length - 1];
      const lastVolume = volumes[volumes.length - 1];
      
      // 4. Calculate Indicators from the SAME dataset
      const rsi = calculateRSI(closePrices);
      const macd = calculateMACD(closePrices);
      const ema = calculateEMA(closePrices, 200);
      
      // 5. Momentum (24h) from the SAME dataset
      const price24hAgo = closePrices[closePrices.length - 25] || closePrices[0];
      const momentum = ((currentPrice - price24hAgo) / price24hAgo) * 100;

      // 6. Logic for Score and Signal
      let score = 50;
      if (rsi < 30) score += 20;
      if (rsi > 70) score -= 10;
      if (macd > 0) score += 15;
      if (momentum > 0) score += 15;

      let signal = "NEUTRAL";
      if (score > 75) signal = "BUY";
      else if (score < 40) signal = "SELL";
      else signal = "RISKY";

      const analysis = {
        id: Math.random().toString(36).substring(7),
        symbol: source.symbol || symbol?.toString().toUpperCase() || "UNKNOWN",
        name: source.name || symbol?.toString().toUpperCase() || "UNKNOWN",
        price: currentPrice,
        score: Math.min(99, Math.max(1, Math.floor(score))),
        signal,
        momentum,
        source: "GeckoTerminal",
        isReal: true,
        timestamp: new Date().toISOString(),
        indicators: { rsi, macd, ema },
        metadata: {
          chainId: source.chainId,
          dexId: source.dexId,
          pairAddress: source.pairAddress,
          liquidity: source.liquidity,
          volume24h: source.volume24h,
          lastVolume
        }
      };

      res.json(analysis);

    } catch (error: any) {
      const status = error.message.includes("Liquidez") || error.message.includes("encontrado") ? 404 : 500;
      res.status(status).json({ 
        error: error.message,
        detail: "Tente um símbolo diferente ou verifique a liquidez do token."
      });
    }
  });

  // Cache for signals to avoid rate limits
  let signalsCache: { data: any[], timestamp: number } | null = null;
  const SIGNALS_CACHE_TTL = 60 * 1000; // 1 minute

  // Real Signals Endpoint (100% REAL DATA - COINGECKO WITH GECKOTERMINAL FALLBACK)
  app.get("/api/crypto/signals", async (req, res) => {
    // Check cache first
    if (signalsCache && Date.now() - signalsCache.timestamp < SIGNALS_CACHE_TTL) {
      return res.json(signalsCache.data);
    }

    try {
      // Try CoinGecko first
      try {
        const response = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
          params: {
            vs_currency: "usd",
            order: "price_change_percentage_24h_desc",
            per_page: 10,
            page: 1,
            sparkline: false,
            price_change_percentage: "24h"
          },
          timeout: 8000 // Increased timeout
        });

        const signals = response.data.map((coin: any) => {
          const momentum = coin.price_change_percentage_24h || 0;
          return {
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            price: coin.current_price,
            score: Math.min(99, Math.max(40, 50 + Math.floor(momentum))),
            signal: momentum > 5 ? "BUY" : "NEUTRAL",
            timestamp: new Date().toLocaleTimeString()
          };
        });

        // Update cache
        signalsCache = { data: signals, timestamp: Date.now() };
        return res.json(signals);
      } catch (cgError: any) {
        // If it's a rate limit (429), don't log as error, just warn
        if (cgError.response?.status === 429) {
          console.warn("[Signals] CoinGecko rate limited, using fallback...");
        } else {
          console.warn("[Signals] CoinGecko failed:", cgError.message, "trying fallback...");
        }
        
        const networks = ["eth", "bsc", "polygon", "arbitrum"];
        let gtSignals: any[] = [];
        
        for (const network of networks) {
          try {
            const gtResponse = await axios.get(`https://api.geckoterminal.com/api/v2/networks/${network}/trending_pools`, {
              timeout: 4000
            });

            if (gtResponse.data?.data) {
              const signals = gtResponse.data.data.slice(0, 10).map((pool: any) => {
                const attrs = pool.attributes;
                const momentum = parseFloat(attrs.price_change_percentage?.h24 || "0");
                const symbol = attrs.name.split(" / ")[0];
                
                return {
                  symbol: symbol.toUpperCase(),
                  name: symbol,
                  price: parseFloat(attrs.base_token_price_usd || "0"),
                  score: Math.min(99, Math.max(40, 60 + Math.floor(momentum))),
                  signal: momentum > 10 ? "BUY" : "NEUTRAL",
                  timestamp: new Date().toLocaleTimeString()
                };
              });
              gtSignals = [...gtSignals, ...signals];
              if (gtSignals.length >= 10) break;
            }
          } catch (e) {
            console.warn(`[Signals] GeckoTerminal ${network} failed, trying next...`);
          }
        }

        if (gtSignals.length > 0) {
          const finalSignals = gtSignals.slice(0, 10);
          // Update cache even for fallback data
          signalsCache = { data: finalSignals, timestamp: Date.now() };
          return res.json(finalSignals);
        }
        
        throw new Error("All signal sources failed");
      }
    } catch (error: any) {
      console.error("[Signals] All sources failed:", error.message);
      res.status(500).json({ error: "Failed to fetch signals from any source" });
    }
  });

  // History Endpoint (UNIFIED WITH RESOLVER)
  app.get("/api/crypto/history", async (req, res) => {
    try {
      const { symbol, chainId, pairAddress } = req.query;
      
      let targetChain = chainId as string;
      let targetPool = pairAddress as string;

      // If only symbol is provided, resolve it first to ensure consistency
      if (!targetChain || !targetPool) {
        if (!symbol) return res.status(400).json({ error: "Symbol or Pool info required" });
        const source = await resolveDataSource(symbol as string);
        targetChain = source.chainId;
        targetPool = source.pairAddress;
      }

      const response = await axios.get(`https://api.geckoterminal.com/api/v2/networks/${targetChain}/pools/${targetPool}/ohlcv/hour?limit=200`, { timeout: 5000 });
      const ohlcvList = response.data.data.attributes.ohlcv_list;
      
      const history = ohlcvList.map((d: any) => ({
        time: d[0],
        open: d[1],
        high: d[2],
        low: d[3],
        close: d[4],
        volume: d[5]
      })).reverse();

      res.json(history);
    } catch (error) {
      res.json([]); 
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
