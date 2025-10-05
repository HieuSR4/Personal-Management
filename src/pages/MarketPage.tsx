import { useEffect, useMemo, useRef, useState } from "react";
import { AIChatPanel } from "../features/aiTrader/components/AIChatPanel";
import { TrendAnalysisModal } from "../features/aiTrader/components/TrendAnalysisModal";
import { TrendChart } from "../features/aiTrader/components/TrendChart";
import { useMarketInsights } from "../features/aiTrader/hooks/useMarketInsights";
import type { MarketInsight, ModelMode } from "../features/aiTrader/types";
import "../features/aiTrader/styles.css";

interface AssetOption {
  symbol: string;
  label: string;
}

interface TimeframeOption {
  label: string;
  value: string;
}

export function MarketPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = widgetContainerRef.current;
    if (!container) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `{
  "allow_symbol_change": true,
  "calendar": false,
  "details": false,
  "hide_side_toolbar": true,
  "hide_top_toolbar": false,
  "hide_legend": false,
  "hide_volume": false,
  "hotlist": false,
  "interval": "60",
  "locale": "en",
  "save_image": true,
  "style": "1",
  "symbol": "BINANCE:BTCUSDT",
  "theme": "dark",
  "timezone": "Asia/Ho_Chi_Minh",
  "backgroundColor": "#0F0F0F",
  "gridColor": "rgba(242, 242, 242, 0.06)",
  "watchlist": [],
  "withdateranges": false,
  "compareSymbols": [],
  "studies": [],
  "width": "100%",
  "height": 610
}`;

    container.appendChild(script);

    return () => {
      if (container.contains(script)) {
        container.removeChild(script);
      }
    };
  }, []);

  const assetOptions: AssetOption[] = useMemo(
    () => [
      { symbol: "BTCUSDT", label: "Bitcoin" },
      { symbol: "ETHUSDT", label: "Ethereum" },
      { symbol: "SOLUSDT", label: "Solana" },
      { symbol: "BNBUSDT", label: "BNB" }
    ],
    []
  );

  const timeframeOptions: TimeframeOption[] = useMemo(
    () => [
      { label: "1H", value: "1H" },
      { label: "4H", value: "4H" },
      { label: "1D", value: "1D" }
    ],
    []
  );

  const [selectedAsset, setSelectedAsset] = useState(assetOptions[0].symbol);
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframeOptions[1].value);
  const [modelMode, setModelMode] = useState<ModelMode>("short-term");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { insight, isLoading, error, refresh, lastUpdated } = useMarketInsights({
    asset: selectedAsset,
    timeframe: selectedTimeframe,
    modelMode
  });

  const currentAssetLabel = useMemo(
    () => assetOptions.find((option) => option.symbol === selectedAsset)?.label ?? selectedAsset,
    [assetOptions, selectedAsset]
  );

  const toggleDrawer = () => setIsDrawerOpen((prev) => !prev);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const insightAvailable = !isLoading && Boolean(insight);
  const safeInsight: MarketInsight | undefined = insightAvailable ? (insight as MarketInsight) : undefined;
  return (
    <section className="page market-page">
      <div className="page-header" />
      <div className="card" style={{ minHeight: 700 }}>
        <h3>Market Cryptocurrency</h3>
        <div
          className="tradingview-widget-container"
          style={{ height: "100%", width: "100%" }}
          ref={widgetContainerRef}
        >
          <div
            className="tradingview-widget-container__widget"
            style={{ height: "calc(100% - 32px)", width: "100%" }}
          />
        </div>
      </div>

      <div className="ai-market-page">
        <header className="card ai-market-header">
          <div>
            <div className="ai-market-header__meta">
              <span>Tài sản: {currentAssetLabel}</span>
              <span>Khung: {selectedTimeframe}</span>
              <span>Chế độ: {modelMode === "reinforcement" ? "Reinforcement" : "Dự báo"}</span>
              {lastUpdated ? <span>Cập nhật: {new Date(lastUpdated).toLocaleTimeString()}</span> : null}
            </div>
          </div>
          <div className="ai-market-header__actions">
            <button onClick={refresh} disabled={isLoading}>
              {isLoading ? "Đang tải..." : "Làm mới"}
            </button>
            <button onClick={openModal} disabled={!insightAvailable}>
              Phân tích chuyên sâu
            </button>
            <button onClick={toggleDrawer}>Cài đặt</button>
          </div>
        </header>

        <div className="ai-market-grid">
          <div className="card">
            <h3>Xu hướng giá & dự báo</h3>
            {isLoading && <p>Đang tải dữ liệu mô phỏng...</p>}
            {error && <p style={{ color: "#f87171" }}>Không thể tải dữ liệu: {error.message}</p>}
            {safeInsight ? <TrendChart series={safeInsight.forecastSeries} trades={safeInsight.trades} /> : null}
          </div>

          <div className="ai-market-grid__side">
            <div className="card">
              <h3>Key Takeaways</h3>
              <ul className="analysis-list analysis-list--stacked">
                {safeInsight ? (
                  safeInsight.keyTakeaways.map((takeaway) => (
                    <li key={takeaway}>
                      <span>{takeaway}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>Đang chuẩn bị insight...</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="card">
              <h3>Risk Monitor</h3>
              <ul className="analysis-list">
                {safeInsight ? (
                  safeInsight.risk.map((metric) => (
                    <li key={metric.label}>
                      <strong>{metric.value}</strong>
                      <span>
                        {metric.label} {metric.change ? `· ${metric.change}` : ""}
                      </span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>Chưa có dữ liệu rủi ro.</span>
                  </li>
                )}
              </ul>
            </div>

            <div className="card">
              <h3>Tín hiệu chỉ báo</h3>
              <ul className="analysis-list analysis-list--stacked">
                {safeInsight ? (
                  safeInsight.indicators.map((indicator) => (
                    <li key={indicator.name}>
                      <div className="indicator-row">
                        <strong>{indicator.name}</strong>
                        <span className={`indicator indicator--${indicator.signal}`}>
                          {indicator.signal.toUpperCase()}
                        </span>
                      </div>
                      <span>{indicator.description}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <span>Chưa có tín hiệu chỉ báo.</span>
                  </li>
                )}
              </ul>
            </div>

            <AIChatPanel asset={selectedAsset} timeframe={selectedTimeframe} modelMode={modelMode} insight={safeInsight} />
          </div>
        </div>

        <aside className={`settings-drawer ${isDrawerOpen ? "settings-drawer--open" : ""}`}>
          <div className="settings-drawer__header">
            <h4>Cấu hình</h4>
            <button onClick={toggleDrawer}>Đóng</button>
          </div>
          <div>
            <label htmlFor="asset-select">Tài sản</label>
            <select
              id="asset-select"
              value={selectedAsset}
              onChange={(event) => setSelectedAsset(event.target.value)}
            >
              {assetOptions.map((option) => (
                <option key={option.symbol} value={option.symbol}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="timeframe-select">Khung thời gian</label>
            <select
              id="timeframe-select"
              value={selectedTimeframe}
              onChange={(event) => setSelectedTimeframe(event.target.value)}
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mode-select">Chế độ mô hình</label>
            <select
              id="mode-select"
              value={modelMode}
              onChange={(event) => setModelMode(event.target.value as ModelMode)}
            >
              <option value="short-term">Dự báo ngắn hạn</option>
              <option value="reinforcement">Chiến lược reinforcement</option>
            </select>
          </div>
        </aside>

        <TrendAnalysisModal open={isModalOpen} insight={safeInsight} onClose={closeModal} />
      </div>
    </section>
  );
}