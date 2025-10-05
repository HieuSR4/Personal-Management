import type { MarketInsight, ModelMode } from "../types";

const BASE_SUMMARY =
  "Thị trường đang trong giai đoạn phục hồi sau cú điều chỉnh ngắn. Động lượng tăng bắt đầu quay trở lại nhưng vẫn cần theo dõi kháng cự gần nhất.";

const KEY_TAKEAWAYS = [
  "Khối lượng tăng 15% so với trung bình 20 phiên",
  "Đường EMA 21 cắt lên EMA 55",
  "RSI vẫn dưới vùng quá mua, tạo dư địa tiếp tục đi lên"
];

function generateForecastSeries(): MarketInsight["forecastSeries"] {
  const now = Date.now();
  const points = [] as MarketInsight["forecastSeries"];
  let price = 42000;
  for (let i = 0; i < 48; i += 1) {
    const timestamp = new Date(now - (47 - i) * 30 * 60 * 1000).toISOString();
    const drift = Math.sin(i / 6) * 120 + (i > 24 ? 80 : -40);
    const noise = Math.cos(i / 3) * 40;
    const actual = i < 36 ? price + drift + noise : undefined;
    const forecast = price + drift + noise * 0.3 + (i - 36) * 10;
    const confidenceLower = forecast - 180 - Math.max(0, i - 34) * 3;
    const confidenceUpper = forecast + 180 + Math.max(0, i - 34) * 4;
    points.push({
      timestamp,
      actual,
      forecast,
      confidenceLower,
      confidenceUpper
    });
  }
  return points;
}

function buildTrades(): MarketInsight["trades"] {
  return [
    {
      id: "T-001",
      direction: "long",
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      price: 41680,
      size: 0.8,
      rationale: "Mua khi RSI phục hồi từ vùng quá bán và MACD cắt lên 0"
    },
    {
      id: "T-002",
      direction: "short",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      price: 42450,
      size: 0.5,
      rationale: "Bán phòng thủ khi giá chạm dải trên Bollinger và khối lượng suy yếu"
    }
  ];
}

function buildIndicators(): MarketInsight["indicators"] {
  return [
    {
      name: "EMA Cross",
      value: 1,
      signal: "bullish",
      description: "EMA 21 vừa cắt lên EMA 55, xác nhận xu hướng tăng ngắn hạn"
    },
    {
      name: "RSI",
      value: 58,
      signal: "neutral",
      description: "RSI dao động quanh 58, tránh rủi ro quá mua"
    },
    {
      name: "Funding Rate",
      value: 0.012,
      signal: "bearish",
      description: "Funding dương cao có thể gây áp lực chốt lời cho vị thế long"
    }
  ];
}

function buildRiskMetrics(): MarketInsight["risk"] {
  return [
    { label: "Sharpe (30d)", value: "1.62", change: "▲ 0.14" },
    { label: "Max Drawdown", value: "-6.4%", change: "▼ 0.9%" },
    { label: "Volatility", value: "3.1%", change: "▲ 0.3%" }
  ];
}

function buildBacktest(): MarketInsight["backtest"] {
  return {
    cagr: 0.38,
    sharpe: 1.82,
    maxDrawdown: -0.12,
    winRate: 0.58,
    trades: 124
  };
}

export function buildMockInsight(
  asset: string,
  timeframe: string,
  modelMode: ModelMode
): MarketInsight {
  return {
    asset,
    timeframe,
    modelMode,
    generatedAt: new Date().toISOString(),
    forecastHorizonHours: timeframe === "1D" ? 72 : 12,
    summary: BASE_SUMMARY,
    keyTakeaways: KEY_TAKEAWAYS,
    forecastSeries: generateForecastSeries(),
    trades: buildTrades(),
    indicators: buildIndicators(),
    risk: buildRiskMetrics(),
    backtest: buildBacktest(),
    strategyNotes:
      modelMode === "reinforcement"
        ? "Agent reinforcement ưu tiên giữ vị thế với stop trailing dựa trên ATR."
        : "Mô hình dự báo ngắn hạn ưu tiên giao dịch theo tín hiệu EMA và khối lượng."
  };
}