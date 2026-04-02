export type Plan = 'FREE' | 'PRO' | 'PREMIUM';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  plan: Plan;
  analysesCount: number;
  lastAnalysisDate: string;
  stripeCustomerId?: string;
  subscriptionId?: string;
}

export interface TokenAnalysis {
  id: string;
  symbol: string;
  name: string;
  price: number;
  score: number;
  signal: 'BUY' | 'SELL' | 'RISKY';
  liquidity: number;
  volume24h: number;
  momentum: number;
  hype: number;
  timestamp: string;
  indicators: {
    rsi: number;
    macd: number;
    ema: number;
  };
}

export interface AnalysisLog {
  id: string;
  userId: string;
  tokenSymbol: string;
  tokenName: string;
  result: TokenAnalysis;
  timestamp: string;
}
