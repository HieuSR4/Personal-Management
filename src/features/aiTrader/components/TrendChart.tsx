import {
  Area,
  CartesianGrid,
  ComposedChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ForecastPoint, TradeMarker } from "../types.ts";
import "../styles.css";

interface TrendChartProps {
  series: ForecastPoint[];
  trades: TradeMarker[];
}

export function TrendChart({ series, trades }: TrendChartProps) {
  const chartData = series.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }),
    actual: point.actual,
    forecast: point.forecast,
    confidenceBase: point.confidenceLower,
    confidenceRange: point.confidenceUpper - point.confidenceLower
  }));

  const renderTooltip = ({ active, payload, label }: TooltipProps<string, string>) => {
    if (!active || !payload?.length) {
      return null;
    }

    const actualPoint = payload.find((item: any) => item.dataKey === "actual");
    const forecastPoint = payload.find((item: any) => item.dataKey === "forecast");
    const basePoint = payload.find((item: any) => item.dataKey === "confidenceBase");
    const rangePoint = payload.find((item: any) => item.dataKey === "confidenceRange");

    const lower = typeof basePoint?.value === "number" ? basePoint.value : undefined;
    const upper =
      typeof basePoint?.value === "number" && typeof rangePoint?.value === "number"
        ? basePoint.value + rangePoint.value
        : undefined;

    const formatValue = (value?: number | string) => {
      const numeric =
        typeof value === "number" ? value : value !== undefined ? Number(value) : undefined;
      return numeric !== undefined && !Number.isNaN(numeric)
        ? numeric.toLocaleString("en-US", { maximumFractionDigits: 2 })
        : "-";
    };

    return (
      <div className="trend-chart__tooltip">
        <strong>{label}</strong>
        <div>
          <span>Giá thực:</span>
          <span>{formatValue(actualPoint?.value)}</span>
        </div>
        <div>
          <span>Dự báo:</span>
          <span>{formatValue(forecastPoint?.value)}</span>
        </div>
        <div>
          <span>Biên độ:</span>
          <span>
            {formatValue(lower)} - {formatValue(upper)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="trend-chart">
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={chartData} margin={{ top: 16, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-muted)" />
          <XAxis dataKey="timestamp" stroke="var(--text-muted)" fontSize={12} angle={-12} dy={8} height={60} />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={12}
            domain={["dataMin - 200", "dataMax + 200"]}
            tickFormatter={(value) => value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          />
          <Tooltip content={renderTooltip} />
          <Area
            type="monotone"
            dataKey="confidenceBase"
            stroke="none"
            fill="transparent"
            activeDot={false}
            isAnimationActive={false}
            stackId="confidence"
          />
          <Area
            type="monotone"
            dataKey="confidenceRange"
            stroke="none"
            fill="var(--trend-confidence)"
            fillOpacity={0.18}
            activeDot={false}
            isAnimationActive={false}
            stackId="confidence"
          />
          <Area
            type="monotone"
            dataKey="forecast"
            stroke="var(--trend-forecast)"
            fill="transparent"
            strokeWidth={2}
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--trend-actual)"
            fill="transparent"
            strokeWidth={2}
            dot={{ r: 1.6 }}
          />
          {trades.map((trade) => (
            <ReferenceDot
              key={trade.id}
              x={new Date(trade.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })}
              y={trade.price}
              r={6}
              fill={trade.direction === "long" ? "var(--trade-long)" : "var(--trade-short)"}
              stroke="var(--card-bg)"
              strokeWidth={2}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="trend-chart__trades">
        {trades.map((trade) => (
          <div key={trade.id} className={`trade-pill trade-pill--${trade.direction}`}>
            <span>{trade.direction === "long" ? "Long" : "Short"}</span>
            <strong>{trade.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
            <small>{new Date(trade.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
          </div>
        ))}
      </div>
    </div>
  );
}