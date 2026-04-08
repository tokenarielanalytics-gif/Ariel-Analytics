import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, TrendingUp, BarChart3, Shield, Zap, LogOut, User, Settings, CreditCard, Loader2, CheckCircle2, AlertCircle, TrendingDown } from "lucide-react";
import axios from "axios";
import { db, onSnapshot, doc, collection, setDoc, OperationType, handleFirestoreError, auth } from "../firebase";
import CustomChart from "./CustomChart";

export default function Dashboard({ user: initialUser, onLogout }: { user: any; onLogout: () => void }) {
  const [user, setUser] = useState(initialUser);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("analysis");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [newSignal, setNewSignal] = useState<any>(null);

  const [signals, setSignals] = useState<any[]>([]);
  const [signalsError, setSignalsError] = useState<string | null>(null);

  // Real-time user profile listener (REAL)
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setUser((prev: any) => ({ ...prev, ...snapshot.data() }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch real signals (REAL)
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await axios.get("/api/crypto/signals");
        setSignals(response.data);
        setSignalsError(null);
      } catch (error) {
        console.error("Failed to fetch signals", error);
        setSignalsError("Erro ao carregar sinais. Tentando novamente...");
      }
    };
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab !== "signals") {
        const signal = signals[Math.floor(Math.random() * signals.length)];
        if (signal && signal.score > 80) {
          setNewSignal(signal);
          setTimeout(() => setNewSignal(null), 5000);
        }
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab, signals]);

  const handleSearch = async (e?: React.FormEvent, symbolOverride?: string) => {
    if (e) e.preventDefault();
    const targetSearch = symbolOverride || search;
    if (!targetSearch) return;
    
    setLoading(true);
    setError(null);
    setActiveTab("analysis");
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Usuário não autenticado");
      
      const response = await axios.get(`/api/crypto/analyze?symbol=${targetSearch}`, {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });
      
      const analysisData = response.data;
      setAnalysis(analysisData);
      setHistory(prev => [targetSearch.toUpperCase(), ...prev.filter(s => s !== targetSearch.toUpperCase()).slice(0, 4)]);

      // Save to Firestore history and update usage
      const analysisId = Math.random().toString(36).substring(7);
      const historyPath = `users/${user.uid}/history/${analysisId}`;
      
      try {
        await setDoc(doc(db, "users", user.uid, "history", analysisId), {
          id: analysisId,
          userId: user.uid,
          symbol: analysisData.symbol || search.toUpperCase() || "UNKNOWN",
          score: analysisData.score || 0,
          signal: analysisData.signal || "NEUTRAL",
          timestamp: new Date().toISOString()
        });

        await setDoc(doc(db, "users", user.uid), {
          analysesCount: (user.analysesCount || 0) + 1,
          lastAnalysisDate: new Date().toISOString()
        }, { merge: true });
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.WRITE, historyPath);
      }

    } catch (error: any) {
      if (error.response?.status === 403) {
        setError("Limite de uso atingido para o seu plano!");
      } else if (error.response?.status === 404) {
        setError(error.response.data.detail || "Token não encontrado ou sem histórico OHLC.");
      } else {
        setError("Erro ao analisar token. Tente novamente mais tarde.");
        console.error("Analysis failed", error);
      }
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePro = () => {
    window.location.href = "https://buy.stripe.com/test_aFa4gA6Ir1tacHMdHQe7m00";
  };

  const handleUpgradePremium = () => {
    window.location.href = "https://buy.stripe.com/test_fZueVe7Mv3Bi6jo0V4e7m01";
  };

  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Notification Toast */}
      {newSignal && (
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          className="fixed top-8 right-8 z-50 glass-card p-4 border-cyan-neon/50 neon-glow flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-cyan-neon/10 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-cyan-neon" />
          </div>
          <div>
            <p className="text-sm font-bold">Novo Sinal: {newSignal.symbol}</p>
            <p className="text-xs text-gray-400">Score: {newSignal.score} | {newSignal.signal}</p>
          </div>
          <button 
            onClick={() => {
              setSearch(newSignal.symbol);
              setActiveTab("analysis");
              handleSearch(undefined, newSignal.symbol);
              setNewSignal(null);
            }}
            className="px-3 py-1 bg-cyan-neon text-navy-900 text-xs font-bold rounded-lg"
          >
            Ver
          </button>
        </motion.div>
      )}

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-neon/10 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-cyan-neon" />
          </div>
          <h1 className="text-xl font-display font-bold">Ariel</h1>
        </div>

        <nav className="flex flex-col gap-2 flex-grow">
          {[
            { id: "analysis", icon: BarChart3, label: "Análise" },
            { id: "signals", icon: TrendingUp, label: "Sinais" },
            { id: "billing", icon: CreditCard, label: "Assinatura" },
            { id: "settings", icon: Settings, label: "Configurações" },
            ...(user.role === 'admin' ? [{ id: "crm", icon: User, label: "CRM" }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeTab === item.id 
                  ? "bg-cyan-neon/10 text-cyan-neon" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Powered by</p>
          <p className="text-sm font-display font-bold text-cyan-neon mb-3">Ariel Agente (AG)</p>
          <a
            href="https://arielagente.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2 bg-cyan-neon/10 text-cyan-neon text-center text-xs font-bold rounded-lg hover:bg-cyan-neon/20 transition-all"
          >
            Comprar Token AG
          </a>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border border-white/10" />
            <div className="flex-grow overflow-hidden">
              <p className="text-sm font-bold truncate">{user.displayName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div className="flex flex-col gap-2">
            <form onSubmit={handleSearch} className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar token (ex: PEPE, SOL)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-cyan-neon/50 transition-all"
              />
              {loading && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-neon animate-spin" />
              )}
            </form>
            {history.length > 0 && (
              <div className="flex gap-2">
                {history.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setSearch(s);
                      handleSearch(undefined, s);
                    }}
                    className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded hover:bg-white/10 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-purple-neon/10 border border-purple-neon/20 rounded-lg text-purple-neon text-sm font-bold">
              Plano: {user.plan || 'FREE'}
            </div>
            <div className="px-4 py-2 bg-cyan-neon/10 border border-cyan-neon/20 rounded-lg text-cyan-neon text-sm font-bold">
              Uso: {user.analysesCount || 0}/{user.plan === 'PREMIUM' ? 200 : user.plan === 'PRO' ? 50 : 5}
            </div>
          </div>
        </header>

        {activeTab === "analysis" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Error Message */}
            {error && (
              <div className="lg:col-span-3 p-4 bg-red-400/10 border border-red-400/20 rounded-xl flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-bold">{error}</p>
              </div>
            )}

            {loading && !analysis && (
              <div className="lg:col-span-3 p-20 glass-card flex flex-col items-center justify-center gap-4 text-cyan-neon">
                <Loader2 className="w-12 h-12 animate-spin" />
                <p className="text-lg font-bold animate-pulse">Analisando mercado em tempo real...</p>
                <p className="text-xs text-gray-500">Isso pode levar alguns segundos dependendo da liquidez do pool.</p>
              </div>
            )}

            {/* Analysis Content */}
            {!analysis && !loading ? (
              <div className="lg:col-span-3 p-20 glass-card flex flex-col items-center justify-center gap-4 text-gray-500">
                <Search className="w-12 h-12 opacity-20" />
                <p className="text-lg font-bold">Nenhuma análise ativa</p>
                <p className="text-sm">Busque por um token acima para iniciar a análise técnica em tempo real.</p>
              </div>
            ) : (
              <>
                {/* Chart Section */}
                <div className="lg:col-span-2 glass-card p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-neon/10 flex items-center justify-center text-cyan-neon font-bold text-xl">
                    {analysis ? analysis.symbol[0] : "?"}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      {analysis ? analysis.name : "Análise de Mercado"}
                      {analysis?.isReal && (
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Dados Reais ({analysis.source})
                        </span>
                      )}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {analysis ? (
                        <span className="flex items-center gap-2">
                          {analysis.symbol}/USDT • {new Date(analysis.timestamp).toLocaleTimeString()}
                          {analysis.metadata && (
                            <span className="text-[10px] text-gray-600 border-l border-white/10 pl-2">
                              {analysis.metadata.chainId.toUpperCase()} • {analysis.metadata.dexId}
                            </span>
                          )}
                        </span>
                      ) : "Selecione um token para análise técnica completa"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-display font-bold text-cyan-neon">
                    ${analysis ? analysis.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 }) : "0.00"}
                  </p>
                  {analysis && (
                    <div className={`flex items-center justify-end gap-1 text-sm ${analysis.momentum >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {analysis.momentum >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {analysis.momentum.toFixed(2)}% (24h)
                    </div>
                  )}
                </div>
              </div>
              <div className="h-[450px] w-full">
                <CustomChart 
                  symbol={analysis?.symbol || "BTCUSDT"} 
                  chainId={analysis?.metadata?.chainId}
                  pairAddress={analysis?.metadata?.pairAddress}
                />
              </div>
            </div>

            {/* Score & Indicators */}
            <div className="flex flex-col gap-8">
              <div className="glass-card p-8 bg-gradient-to-br from-cyan-neon/10 to-purple-neon/10 border-cyan-neon/20">
                <h3 className="text-sm font-display font-bold text-cyan-neon mb-4">ARIEL AGENTE (AG)</h3>
                <p className="text-xs text-gray-400 mb-6">
                  Holders do token AG terão acesso vitalício ao plano PREMIUM e recursos exclusivos de IA.
                </p>
                <button
                  onClick={() => window.open("https://pancakeswap.finance/swap?outputCurrency=0xf641fefb35147b73e6eea4da4b69f8a71b544776&chainId=56&inputCurrency=0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "_blank")}
                  className="block w-full py-3 bg-cyan-neon text-navy-900 text-center rounded-xl font-bold hover:bg-cyan-neon/90 transition-all"
                >
                  Comprar AG Agora
                </button>
              </div>

              <div className="glass-card p-8 text-center">
                <h3 className="text-gray-400 font-bold mb-6">SCORE DE CONFIANÇA</h3>
                <div className="relative w-32 h-32 mx-auto mb-6">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      className="stroke-white/5"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="stroke-cyan-neon"
                      strokeWidth="3"
                      strokeDasharray={`${analysis ? analysis.score : 85}, 100`}
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-display font-bold">{analysis ? analysis.score : 85}</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mb-4 uppercase tracking-widest">
                  Baseado em RSI + MACD + Momentum
                </p>
                <div className={cn(
                  "px-4 py-2 rounded-full font-bold text-sm mb-4",
                  analysis?.signal === "BUY" ? "bg-green-400/10 text-green-400" :
                  analysis?.signal === "SELL" ? "bg-red-400/10 text-red-400" :
                  "bg-yellow-400/10 text-yellow-400"
                )}>
                  SINAL: {analysis ? (analysis.signal === "BUY" ? "COMPRA" : analysis.signal === "SELL" ? "VENDA" : "NEUTRO") : "COMPRA"}
                </div>
                
                {analysis && (
                  <div className="text-xs text-gray-400 bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="font-bold text-cyan-neon mb-1 uppercase tracking-wider">Explicação do Sinal</p>
                    <p>
                      {analysis.signal === "BUY" && `Sinal de COMPRA identificado porque o RSI (${analysis.indicators.rsi.toFixed(0)}) indica ${analysis.indicators.rsi < 30 ? 'sobrevenda' : 'espaço para alta'} e o MACD (${analysis.indicators.macd.toFixed(4)}) mostra momentum ${analysis.indicators.macd > 0 ? 'positivo' : 'em recuperação'}.`}
                      {analysis.signal === "SELL" && `Sinal de VENDA identificado porque o RSI (${analysis.indicators.rsi.toFixed(0)}) indica ${analysis.indicators.rsi > 70 ? 'sobrecompra' : 'fraqueza'} e o MACD (${analysis.indicators.macd.toFixed(4)}) mostra momentum ${analysis.indicators.macd < 0 ? 'negativo' : 'perdendo força'}.`}
                      {analysis.signal === "NEUTRAL" && `Sinal NEUTRO. O mercado está lateralizado com RSI em ${analysis.indicators.rsi.toFixed(0)} e MACD estável em ${analysis.indicators.macd.toFixed(4)}.`}
                    </p>
                  </div>
                )}
              </div>

              <div className="glass-card p-8">
                <h3 className="text-gray-400 font-bold mb-6">INDICADORES TÉCNICOS</h3>
                <div className="space-y-6">
                  {[
                    { label: "RSI (14)", value: analysis?.indicators.rsi.toFixed(2) || 68, status: analysis?.indicators.rsi > 70 ? "Sobrecomprado" : analysis?.indicators.rsi < 30 ? "Sobrevendido" : "Neutro" },
                    { label: "MACD", value: analysis?.indicators.macd.toFixed(6) || 0.000012, status: analysis?.indicators.macd > 0 ? "Positivo" : "Negativo" },
                    { 
                      label: "Tendência", 
                      value: analysis?.momentum > 2 ? "ALTA" : analysis?.momentum < -2 ? "BAIXA" : "LATERAL", 
                      status: analysis?.momentum > 2 ? "Bullish" : analysis?.momentum < -2 ? "Bearish" : "Sideways" 
                    },
                    { label: "EMA (200)", value: analysis?.indicators.ema.toFixed(6) || 0.00018, status: "Trend" },
                  ].map((ind, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold">{ind.label}</p>
                        <p className={cn(
                          "text-xs font-bold",
                          ind.status === "Overbought" || ind.status === "Bearish" ? "text-red-400" :
                          ind.status === "Oversold" || ind.status === "Bullish" ? "text-green-400" :
                          "text-gray-500"
                        )}>{ind.status}</p>
                      </div>
                      <p className="font-mono text-cyan-neon">{ind.value}</p>
                    </div>
                  ))}
                </div>
                {analysis?.metadata && (
                  <div className="mt-8 pt-6 border-t border-white/5 space-y-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500 uppercase">Liquidez</span>
                      <span className="text-white font-mono">${analysis.metadata.liquidity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500 uppercase">Volume 24h</span>
                      <span className="text-white font-mono">${analysis.metadata.volume24h.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500 uppercase">Pool</span>
                      <span className="text-white font-mono truncate max-w-[120px]">{analysis.metadata.pairAddress}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

            {/* Latest Signals Section */}
            <div className="lg:col-span-3 glass-card p-8 mt-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Destaques do Mercado (CoinGecko)</h3>
                <button onClick={() => setActiveTab("signals")} className="text-cyan-neon text-sm font-bold hover:underline">Ver Todos</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {signals.slice(0, 4).map((token, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      setSearch(token.symbol);
                      setActiveTab("analysis");
                      handleSearch(undefined, token.symbol);
                    }}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-neon/30 transition-all cursor-pointer group"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-cyan-neon bg-cyan-neon/10 px-2 py-1 rounded">MARKET</span>
                      <span className="text-[10px] text-gray-500">{token.timestamp}</span>
                    </div>
                    <h4 className="text-lg font-bold group-hover:text-cyan-neon transition-colors">{token.symbol}</h4>
                    <p className={`text-sm font-bold ${token.score > 70 ? 'text-green-400' : 'text-yellow-400'}`}>Score: {token.score}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "signals" && (
          <div className="glass-card overflow-hidden">
            {signalsError && (
              <div className="p-4 bg-red-400/10 border-b border-red-400/20 flex items-center gap-3 text-red-400">
                <AlertCircle className="w-4 h-4" />
                <p className="text-xs font-bold">{signalsError}</p>
              </div>
            )}
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-6 font-bold">Token</th>
                  <th className="p-6 font-bold">Preço</th>
                  <th className="p-6 font-bold">Score</th>
                  <th className="p-6 font-bold">Sinal</th>
                  <th className="p-6 font-bold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((token, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-cyan-neon/10 rounded-lg flex items-center justify-center text-xs font-bold text-cyan-neon">
                          {token.symbol[0]}
                        </div>
                        <div>
                          <p className="font-bold">{token.symbol}</p>
                          <p className="text-xs text-gray-500">{token.timestamp}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 font-mono">${token.price.toFixed(6)}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-neon h-full" style={{ width: `${token.score}%` }} />
                        </div>
                        <span className="text-xs font-bold">{token.score}</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        token.signal === "BUY" ? "bg-green-400/10 text-green-400" :
                        token.signal === "SELL" ? "bg-red-400/10 text-red-400" :
                        "bg-yellow-400/10 text-yellow-400"
                      )}>
                        {token.signal}
                      </span>
                    </td>
                    <td className="p-6">
                      <button 
                        onClick={() => {
                          setSearch(token.symbol);
                          setActiveTab("analysis");
                          handleSearch(undefined, token.symbol);
                        }}
                        className="text-cyan-neon hover:underline text-sm font-bold"
                      >
                        Analisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="max-w-4xl mx-auto">
            <div className="glass-card p-8 mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold mb-2">Seu Plano Atual</h2>
                <p className="text-gray-400">Você está no plano <span className="text-cyan-neon font-bold">{user.plan || 'FREE'}</span></p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400 mb-1">Próxima cobrança</p>
                <p className="font-bold">N/A</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { name: "PRO", price: "R$ 9,90", features: ["50 análises diárias", "Sinais avançados", "Indicadores técnicos"] },
                { name: "PREMIUM", price: "R$ 19,90", features: ["200 análises diárias", "Acesso antecipado", "API personalizada"] },
              ].map((plan, i) => (
                <div key={i} className="glass-card p-8 flex flex-col">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-3xl font-bold mb-6">{plan.price}<span className="text-sm text-gray-400 font-normal">/mês</span></p>
                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                        <Zap className="w-4 h-4 text-cyan-neon" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button 
                    onClick={plan.name === "PRO" ? handleUpgradePro : handleUpgradePremium}
                    className="w-full py-3 bg-cyan-neon text-navy-900 rounded-xl font-bold hover:bg-cyan-neon/90 transition-all"
                  >
                    Fazer Upgrade
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto glass-card p-8">
            <h2 className="text-2xl font-bold mb-8">Configurações da Conta</h2>
            <div className="space-y-8">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nome de Exibição</label>
                <input
                  type="text"
                  defaultValue={user.displayName}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-cyan-neon/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">E-mail</label>
                <input
                  type="email"
                  defaultValue={user.email}
                  disabled
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 opacity-50 cursor-not-allowed"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-cyan-neon/5 border border-cyan-neon/10 rounded-xl">
                <div>
                  <p className="font-bold">Notificações por E-mail</p>
                  <p className="text-xs text-gray-400">Receba alertas de sinais importantes</p>
                </div>
                <div className="w-12 h-6 bg-cyan-neon rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-navy-900 rounded-full" />
                </div>
              </div>
              <button className="w-full py-3 bg-cyan-neon text-navy-900 rounded-xl font-bold hover:bg-cyan-neon/90 transition-all">
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {activeTab === "crm" && (
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold">Painel CRM (Admin)</h2>
              <div className="flex gap-4">
                <div className="px-4 py-2 bg-green-400/10 text-green-400 rounded-lg text-sm font-bold">
                  Receita: R$ 1.240,00
                </div>
                <div className="px-4 py-2 bg-cyan-neon/10 text-cyan-neon rounded-lg text-sm font-bold">
                  Usuários: 154
                </div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-6 font-bold">Usuário</th>
                  <th className="p-6 font-bold">Plano</th>
                  <th className="p-6 font-bold">Uso</th>
                  <th className="p-6 font-bold">Status</th>
                  <th className="p-6 font-bold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "João Silva", email: "joao@gmail.com", plan: "PREMIUM", usage: "145/200", status: "Ativo" },
                  { name: "Maria Souza", email: "maria@outlook.com", plan: "PRO", usage: "42/50", status: "Ativo" },
                  { name: "Pedro Lima", email: "pedro@bol.com.br", plan: "FREE", usage: "5/5", status: "Limite Atingido" },
                ].map((u, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="p-6">
                      <div>
                        <p className="font-bold">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        u.plan === "PREMIUM" ? "bg-purple-neon/10 text-purple-neon" :
                        u.plan === "PRO" ? "bg-cyan-neon/10 text-cyan-neon" :
                        "bg-gray-400/10 text-gray-400"
                      )}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="p-6 text-sm font-mono">{u.usage}</td>
                    <td className="p-6">
                      <span className={cn(
                        "text-xs font-bold",
                        u.status === "Ativo" ? "text-green-400" : "text-red-400"
                      )}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-6">
                      <button className="text-gray-400 hover:text-white text-sm font-bold">Gerenciar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
