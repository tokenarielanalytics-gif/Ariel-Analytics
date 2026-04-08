import { motion } from "motion/react";
import { TrendingUp, Shield, Zap, BarChart3, ArrowRight } from "lucide-react";

interface LandingPageProps {
  onStart: () => void;
}

export default function LandingPage({ onStart }: LandingPageProps) {
  const handleUpgradePro = () => {
    window.location.href = "https://buy.stripe.com/test_aFa4gA6Ir1tacHMdHQe7m00";
  };

  const handleUpgradePremium = () => {
    window.location.href = "https://buy.stripe.com/test_fZueVe7Mv3Bi6jo0V4e7m01";
  };

  return (
    <div className="min-h-screen bg-navy-900 text-white overflow-hidden scroll-smooth">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-neon/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-neon/10 blur-[120px] rounded-full animate-pulse delay-1000" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-neon/10 rounded-xl flex items-center justify-center border border-cyan-neon/20">
            <Zap className="w-6 h-6 text-cyan-neon" />
          </div>
          <span className="text-2xl font-display font-bold tracking-tighter">Ariel Analytics</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-cyan-neon transition-colors">Recursos</a>
          <a href="#token" className="hover:text-cyan-neon transition-colors">Token AG</a>
          <a href="#planos" className="hover:text-cyan-neon transition-colors">Preços</a>
        </div>
        <button 
          onClick={onStart}
          className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-full text-sm font-bold hover:bg-white/10 transition-all"
        >
          Entrar no App
        </button>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-neon/10 border border-cyan-neon/20 text-cyan-neon text-xs font-bold mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-neon opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-neon"></span>
              </span>
              NOVO: Detecção de Memecoins em Tempo Real
            </div>
            <h1 className="text-5xl lg:text-7xl font-display font-bold leading-[1.1] mb-8">
              Inteligência <span className="text-cyan-neon">Cripto</span> para a Nova Era Web3.
            </h1>
            <p className="text-xl text-gray-400 mb-10 max-w-lg leading-relaxed">
              Ariel Analytics utiliza IA avançada para detectar sinais, analisar memecoins e fornecer insights on-chain antes de todo o mercado.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={onStart}
                className="px-8 py-4 bg-cyan-neon text-navy-900 rounded-xl font-bold text-lg hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all flex items-center justify-center gap-2 group"
              >
                Começar Agora <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => window.open("https://drive.google.com/uc?export=download&id=1oE7Wvv2i9eJqK-G7wpH6qclYU76G-GdJ", "_blank")}
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
              >
                Ver Documentação
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="glass-card p-4 relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-neon/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
              <img 
                src="https://i.postimg.cc/mgKKNm2Q/Chat-GPT-Image-1-04-2026-23-40-07.png" 
                alt="Dashboard Preview" 
                className="rounded-lg shadow-2xl relative z-10"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-4 left-4 glass-card p-6 border-cyan-neon/30 neon-glow z-20 animate-bounce delay-700">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-bold">Sinal de Compra: PEPE</span>
                </div>
                <p className="text-2xl font-display font-bold text-cyan-neon">+42.5%</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Features Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-display font-bold mb-4">Poder de Análise Ilimitado</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Nossa plataforma combina dados on-chain com algoritmos de IA para dar a você a vantagem competitiva necessária.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Zap,
              title: "Sinais em Tempo Real",
              desc: "Receba alertas instantâneos de pump e detecção de novas memecoins em segundos.",
              color: "text-cyan-neon"
            },
            {
              icon: BarChart3,
              title: "Análise Técnica IA",
              desc: "Nossa IA analisa RSI, MACD e padrões de candle para prever movimentos de preço.",
              color: "text-purple-neon"
            },
            {
              icon: Shield,
              title: "Segurança On-Chain",
              desc: "Verificação automática de contratos para evitar rug pulls e honeypots.",
              color: "text-green-400"
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="glass-card p-8 border-white/5 hover:border-cyan-neon/30 transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 ${feature.color}`}>
                <feature.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* AG Token Section */}
      <section id="token" className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="glass-card p-12 bg-gradient-to-br from-navy-800 to-navy-900 border-cyan-neon/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-neon/5 blur-[100px] -mr-48 -mt-48" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <div>
              <h2 className="text-4xl font-display font-bold mb-6">Ecossistema <span className="text-cyan-neon">Ariel Agente (AG)</span></h2>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                O token AG é o combustível da nossa plataforma. Holders de AG desfrutam de benefícios exclusivos, governança e acesso a ferramentas premium.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "Acesso vitalício ao plano PREMIUM (Holders de 1M+ AG)",
                  "Participação na governança do ecossistema",
                  "Early access a novos sinais de memecoins",
                  "Staking rewards em tokens AG"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-cyan-neon/20 flex items-center justify-center">
                      <Zap className="w-3 h-3 text-cyan-neon" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
                <button 
                  onClick={() => window.open("https://pancakeswap.finance/swap?outputCurrency=0xf641fefb35147b73e6eea4da4b69f8a71b544776&chainId=56&inputCurrency=0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", "_blank")}
                  className="inline-block px-8 py-4 bg-cyan-neon text-navy-900 rounded-xl font-bold hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all"
                >
                  Comprar Token AG
                </button>
            </div>
            <div className="flex justify-center">
              <div className="relative w-64 h-64 lg:w-80 lg:h-80">
                <div className="absolute inset-0 bg-cyan-neon/20 blur-[60px] rounded-full animate-pulse" />
                <img 
                  src="https://i.postimg.cc/43TBxqxL/Chat-GPT-Image-1-04-2026-23-43-07.png" 
                  alt="AG Token" 
                  className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_50px_rgba(0,243,255,0.5)]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="relative z-10 max-w-7xl mx-auto px-6 py-32 scroll-mt-20">
        <div className="text-center mb-20">
          <h2 className="text-4xl font-display font-bold mb-4">Planos e Assinaturas</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Escolha o plano ideal para o seu perfil de trading e comece a lucrar com inteligência.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* FREE Plan */}
          <motion.div
            whileHover={{ y: -10 }}
            className="glass-card p-10 border-white/5 flex flex-col"
          >
            <h3 className="text-2xl font-bold mb-2">Ariel Analytics FREE</h3>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-display font-bold">Gratuito</span>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                "5 análises diárias",
                "Acesso básico aos sinais",
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <Zap className="w-4 h-4 text-cyan-neon" />
                  {benefit}
                </li>
              ))}
            </ul>
            <button
              onClick={onStart}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all"
            >
              Começar grátis
            </button>
          </motion.div>

          {/* PRO Plan */}
          <motion.div
            whileHover={{ y: -10 }}
            className="glass-card p-10 border-white/5 flex flex-col"
          >
            <h3 className="text-2xl font-bold mb-2">Ariel Analytics PRO</h3>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-display font-bold">R$ 9,90</span>
              <span className="text-gray-500">/mês</span>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                "50 análises diárias",
                "Sinais avançados",
                "Indicadores técnicos",
                "Suporte prioritário"
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <Zap className="w-4 h-4 text-cyan-neon" />
                  {benefit}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgradePro}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-xl font-bold hover:bg-white/10 transition-all"
            >
              Assinar PRO
            </button>
          </motion.div>

          {/* PREMIUM Plan */}
          <motion.div
            whileHover={{ y: -10 }}
            className="glass-card p-10 border-cyan-neon/30 relative flex flex-col bg-gradient-to-br from-navy-800 to-navy-900"
          >
            <div className="absolute top-4 right-4 px-3 py-1 bg-cyan-neon text-navy-900 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Mais Popular
            </div>
            <h3 className="text-2xl font-bold mb-2">Ariel Analytics PREMIUM</h3>
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-display font-bold text-cyan-neon">R$ 19,90</span>
              <span className="text-gray-500">/mês</span>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                "200 análises diárias",
                "Acesso antecipado a novos sinais",
                "API personalizada",
                "Gerente de conta dedicado",
                "Acesso ao grupo VIP"
              ].map((benefit, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <Zap className="w-4 h-4 text-cyan-neon" />
                  {benefit}
                </li>
              ))}
            </ul>
            <button
              onClick={handleUpgradePremium}
              className="w-full py-4 bg-cyan-neon text-navy-900 rounded-xl font-bold hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] transition-all"
            >
              Assinar PREMIUM
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-cyan-neon" />
              <span className="text-xl font-display font-bold">Ariel Analytics</span>
            </div>
            <p className="text-gray-500 max-w-sm mb-8">
              A plataforma definitiva para inteligência cripto e análise de dados on-chain. Desenvolvido para traders que buscam a próxima grande oportunidade.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">Produto</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><a href="#" className="hover:text-white transition-colors">Análise de Tokens</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Sinais em Tempo Real</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API para Desenvolvedores</a></li>
              <li><a href="#planos" className="hover:text-white transition-colors">Preços</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Empresa</h4>
            <ul className="space-y-4 text-sm text-gray-500">
              <li><a href="#" className="hover:text-white transition-colors">Sobre Nós</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Termos de Uso</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-600">
          © 2026 Ariel Analytics. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
