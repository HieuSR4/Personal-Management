import type { MarketInsight } from "../types.ts";
import "../styles.css";

interface TrendAnalysisModalProps {
  open: boolean;
  insight?: MarketInsight;
  onClose: () => void;
}

export function TrendAnalysisModal({ open, insight, onClose }: TrendAnalysisModalProps) {
  if (!open || !insight) {
    return null;
  }

  return (
    <div className="trend-modal__backdrop" role="dialog" aria-modal="true">
      <div className="trend-modal">
        <header className="trend-modal__header">
          <div>
            <h3>Phân tích chuyên sâu</h3>
            <p className="trend-modal__subtitle">
              {insight.asset} · Khung {insight.timeframe} · {new Date(insight.generatedAt).toLocaleString()}
            </p>
          </div>
          <button className="trend-modal__close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </header>
        <section className="trend-modal__grid">
          <div>
            <h4>Điểm nhấn chỉ báo</h4>
            <ul className="trend-modal__list">
              {insight.indicators.map((indicator) => (
                <li key={indicator.name}>
                  <strong>{indicator.name}</strong>
                  <span className={`indicator indicator--${indicator.signal}`}>
                    {indicator.signal.toUpperCase()}
                  </span>
                  <p>{indicator.description}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Số liệu rủi ro & backtest</h4>
            <ul className="trend-modal__list trend-modal__list--dense">
              <li>
                CAGR: {(insight.backtest.cagr * 100).toFixed(1)}% · Sharpe {insight.backtest.sharpe.toFixed(2)}
              </li>
              <li>
                Max Drawdown: {(insight.backtest.maxDrawdown * 100).toFixed(1)}% · Tỷ lệ thắng {(insight.backtest.winRate * 100).toFixed(0)}%
              </li>
              <li>Số lệnh backtest: {insight.backtest.trades}</li>
            </ul>
            <p className="trend-modal__notes">{insight.strategyNotes}</p>
          </div>
        </section>
      </div>
    </div>
  );
}