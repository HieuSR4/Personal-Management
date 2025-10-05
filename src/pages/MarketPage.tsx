import { useEffect, useRef } from "react";

export function MarketPage() {
  const widgetContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = widgetContainerRef.current
    if (!container) {
      return
    }

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
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
}`

    container.appendChild(script)

    return () => {
      if (container.contains(script)) {
        container.removeChild(script)
      }
    }
  }, [])
  return (
    <section className="page market-page">
      <div className="page-header">
      </div>
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
    </section>
  );
}

