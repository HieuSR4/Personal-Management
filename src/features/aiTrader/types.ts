export type ModelMode = "short-term" | "reinforcement";

export interface ForecastPoint {
  timestamp: string;
  actual?: number;
  forecast: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export interface TradeMarker {
  id: string;
  direction: "long" | "short";
  timestamp: string;
  price: number;
  size: number;
  rationale: string;
}

export interface IndicatorInsight {
  name: string;
  value: number;
  signal: "bullish" | "bearish" | "neutral";
  description?: string;
}

export interface BacktestSnapshot {
  cagr: number;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  trades: number;
}

export interface RiskMetric {
  label: string;
  value: string;
  change?: string;
}

export interface MarketInsight {
  asset: string;
  timeframe: string;
  modelMode: ModelMode;
  generatedAt: string;
  forecastHorizonHours: number;
  summary: string;
  keyTakeaways: string[];
  forecastSeries: ForecastPoint[];
  trades: TradeMarker[];
  indicators: IndicatorInsight[];
  risk: RiskMetric[];
  backtest: BacktestSnapshot;
  strategyNotes: string;
}

export interface ChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}