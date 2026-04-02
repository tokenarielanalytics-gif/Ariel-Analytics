import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, TrendingUp, BarChart3, Shield, Zap, LogOut, User, Settings, CreditCard, Loader2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import axios from "axios";
import { db, onSnapshot, doc, collection, setDoc, OperationType, handleFirestoreError } from "../firebase";

const mockData = [
  { name: "00:00", price: 0.00012 },
  { name: "04:00", price: 0.00015 },
  { name: "08:00", price: 0.00014 },
  { name: "12:00", price: 0.00018 },
  { name: "16:00", price: 0.00022 },
  { name: "20:00", price: 0.00020 },
  { name: "23:59", price: 0.00025 },
];

export default function Dashboard({ user: initialUser, onLogout }: { user: any; onLogout: () => void }) {
  const [user, setUser] = useState(initialUser);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("analysis");
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [newSignal, setNewSignal] = useState<any>(null);

  const [signals, setSignals] = useState([
    { symbol: "PEPE", name: "Pepe", price: 0.000012, score: 92, signal: "BUY", timestamp: new Date().toLocaleTimeString() },
    { symbol: "WIF", name: "Dogwifhat", price: 2.45, score: 78, signal: "BUY", timestamp: new Date().toLocaleTimeString() },
    { symbol: "BONK", name: "Bonk", price: 0.000025, score: 45, signal: "RISKY", timestamp: new Date().toLocaleTimeString() },
    { symbol: "FLOKI", name: "Floki", price: 0.00018, score: 32, signal: "SELL", timestamp: new Date().toLocaleTimeString() },
  ]);

  // Real-time user profile listener
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === "signals") {
        setSignals(prev => [
          {
            symbol: ["SOL", "DOGE", "SHIB", "LINK"][Math.floor(Math.random() * 4)],
            name: "New Signal",
            price: Math.random() * 100,
            score: Math.floor(Math.random() * 100),
            signal: Math.random() > 0.5 ? "BUY" : "RISKY",
            timestamp: new Date().toLocaleTimeString()
          },
          ...prev.slice(0, 9)
        ]);
      } else {
        const signal = {
          symbol: ["SOL", "DOGE", "SHIB", "LINK"][Math.floor(Math.random() * 4)],
          score: Math.floor(Math.random() * 100),
          signal: Math.random() > 0.5 ? "BUY" : "RISKY",
        };
        if (signal.score > 80) {
          setNewSignal(signal);
          setTimeout(() => setNewSignal(null), 5000);
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search) return;
    
    setLoading(true);
    try {
      const idToken = await initialUser.getIdToken();
      const response = await axios.get(`/api/crypto/analyze?symbol=${search}`, {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });
      
      const analysisData = response.data;
      setAnalysis(analysisData);
      setHistory(prev => [search.toUpperCase(), ...prev.filter(s => s !== search.toUpperCase()).slice(0, 4)]);

      // Save to Firestore history and update usage
      const analysisId = Math.random().toString(36).substring(7);
      const historyPath = `users/${user.uid}/history/${analysisId}`;
      
      try {
        await setDoc(doc(db, "users", user.uid, "history", analysisId), {
          id: analysisId,
          userId: user.uid,
          symbol: analysisData.symbol,
          score: analysisData.score,
          signal: analysisData.signal,
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
        alert("Limite de uso atingido para o seu plano!");
      } else {
        console.error("Analysis failed", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    try {
      const idToken = await initialUser.getIdToken();
      const response = await axios.post("/api/stripe/create-checkout-session", { plan }, {
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Upgrade failed", error);
      alert("Erro ao iniciar checkout. Verifique se as chaves do Stripe estão configuradas.");
    }
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
              handleSearch({ preventDefault: () => {} } as any);
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
                      handleSearch({ preventDefault: () => {} } as any);
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
            {/* Chart Section */}
            <div className="lg:col-span-2 glass-card p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-2xl font-bold">{analysis ? analysis.name : "Análise de Mercado"}</h2>
                  <p className="text-gray-400 text-sm">Preço em tempo real (USD)</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-display font-bold text-cyan-neon">
                    ${analysis ? analysis.price.toFixed(6) : "0.00025"}
                  </p>
                  <p className="text-green-400 text-sm">+12.5% (24h)</p>
                </div>
              </div>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#121432", border: "1px solid #ffffff10", borderRadius: "12px" }}
                      itemStyle={{ color: "#00f3ff" }}
                    />
                    <Area type="monotone" dataKey="price" stroke="#00f3ff" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Score & Indicators */}
            <div className="flex flex-col gap-8">
              <div className="glass-card p-8 bg-gradient-to-br from-cyan-neon/10 to-purple-neon/10 border-cyan-neon/20">
                <h3 className="text-sm font-display font-bold text-cyan-neon mb-4">ARIEL AGENTE (AG)</h3>
                <p className="text-xs text-gray-400 mb-6">
                  Holders do token AG terão acesso vitalício ao plano PREMIUM e recursos exclusivos de IA.
                </p>
                <a
                  href="https://arielagente.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 bg-cyan-neon text-navy-900 text-center rounded-xl font-bold hover:bg-cyan-neon/90 transition-all"
                >
                  Comprar AG Agora
                </a>
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
                <div className={cn(
                  "px-4 py-2 rounded-full font-bold text-sm",
                  analysis?.signal === "BUY" ? "bg-green-400/10 text-green-400" :
                  analysis?.signal === "SELL" ? "bg-red-400/10 text-red-400" :
                  "bg-yellow-400/10 text-yellow-400"
                )}>
                  SINAL: {analysis ? analysis.signal : "BUY"}
                </div>
              </div>

              <div className="glass-card p-8">
                <h3 className="text-gray-400 font-bold mb-6">INDICADORES TÉCNICOS</h3>
                <div className="space-y-6">
                  {[
                    { label: "RSI (14)", value: analysis?.indicators.rsi || 68, status: "Overbought" },
                    { label: "MACD", value: analysis?.indicators.macd.toFixed(6) || 0.000012, status: "Bullish" },
                    { label: "EMA (200)", value: analysis?.indicators.ema.toFixed(6) || 0.00018, status: "Support" },
                  ].map((ind, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-bold">{ind.label}</p>
                        <p className="text-xs text-gray-500">{ind.status}</p>
                      </div>
                      <p className="font-mono text-cyan-neon">{ind.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Latest Tokens Section */}
            <div className="lg:col-span-3 glass-card p-8 mt-8">
              <h3 className="text-xl font-bold mb-6">Novos Tokens Detectados (Dexscreener)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { symbol: "MOON", chain: "Solana", age: "2m", liquidity: "$45k" },
                  { symbol: "AI", chain: "Base", age: "5m", liquidity: "$120k" },
                  { symbol: "AG", chain: "Solana", age: "12m", liquidity: "$2.5M" },
                  { symbol: "CAT", chain: "Ethereum", age: "15m", liquidity: "$80k" },
                ].map((token, i) => (
                  <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-neon/30 transition-all cursor-pointer group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-cyan-neon bg-cyan-neon/10 px-2 py-1 rounded">{token.chain}</span>
                      <span className="text-[10px] text-gray-500">{token.age} atrás</span>
                    </div>
                    <h4 className="text-lg font-bold group-hover:text-cyan-neon transition-colors">{token.symbol}</h4>
                    <p className="text-sm text-gray-400">Liquidez: {token.liquidity}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "signals" && (
          <div className="glass-card overflow-hidden">
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
                          handleSearch({ preventDefault: () => {} } as any);
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
                    onClick={() => handleUpgrade(plan.name)}
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
