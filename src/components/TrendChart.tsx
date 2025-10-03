import type { ReactNode } from 'react'
import {
  Area,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotProps,
  type TooltipProps,
} from 'recharts'
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'

export type TrendPoint = {
  label: string
  value: number
  date: Date
  annotation?: ReactNode
}

type TrendChartProps = {
  points: TrendPoint[]
  height?: number
}

type ChartDatum = TrendPoint & {
  index: number
}

const DEFAULT_HEIGHT = 360
const TICK_COUNT = 4

function niceMax(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 1
  const exponent = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exponent
  let niceFraction
  if (fraction <= 1) niceFraction = 1
  else if (fraction <= 2) niceFraction = 2
  else if (fraction <= 5) niceFraction = 5
  else niceFraction = 10
  return niceFraction * 10 ** exponent
}

function formatTick(value: number) {
  if (!Number.isFinite(value)) return '0'
  if (value === 0) return '0'
  if (value >= 1_000_000_000) {
    return `${Number(value / 1_000_000_000).toFixed(value % 1_000_000_000 === 0 ? 0 : 1)} tỉ`
  }
  if (value >= 1_000_000) {
    return `${Number(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} triệu`
  }
  if (value >= 1_000) {
    return `${Number(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)} nghìn`
  }
  return value.toLocaleString('vi-VN')
}

const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload as ChartDatum | undefined
  if (!datum) return null
  return (
    <div className="trend-tooltip">
      <span className="trend-tooltip__label">{datum.label}</span>
      <strong className="trend-tooltip__value">{datum.value.toLocaleString('vi-VN')} VND</strong>
    </div>
  )
}

function renderDot(lastIndex: number) {
  return (props: DotProps) => {
    const { cx, cy } = props
    const payload = (props as any).payload
    const datum = payload as ChartDatum
    const isLast = datum && datum.index === lastIndex
    // Always return a valid SVG element, even if cx/cy/payload are invalid
    return (
      <g>
        {typeof cx === 'number' && typeof cy === 'number' && payload ? (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={isLast ? 8 : 6}
              fill={isLast ? '#38bdf8' : '#6366f1'}
              stroke="#0f172a"
              strokeWidth={isLast ? 3 : 2}
            />
            {datum.annotation}
          </>
        ) : (
          <circle cx={0} cy={0} r={0} fill="none" />
        )}
      </g>
    )
  }
}

export function TrendChart({ points, height = DEFAULT_HEIGHT }: TrendChartProps) {
  if (!points.length) return null

  const data: ChartDatum[] = points.map((point, index) => ({ ...point, index }))
  const maxValue = Math.max(...data.map((point) => point.value), 0)
  const yMax = niceMax(maxValue || 1)
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => (yMax / TICK_COUNT) * index)
  const labelInterval = points.length > 9 ? Math.ceil(points.length / 9) - 1 : 0
  const lastIndex = data.length - 1

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 24, right: 32, bottom: 32, left: 8 }} className="trend-chart">
          <defs>
            <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trendLineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="4 12" stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
          <XAxis
            dataKey="label"
            interval={labelInterval}
            tick={{ fill: '#94a3b8', fontSize: 14, fontWeight: 600 }}
            tickMargin={16}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            ticks={ticks}
            domain={[0, yMax]}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatTick}
            width={90}
            tick={{ fill: '#94a3b8', fontSize: 14, fontWeight: 600 }}
          />
          <Tooltip
            content={CustomTooltip}
            cursor={{ stroke: 'rgba(148, 163, 184, 0.35)', strokeDasharray: '4 8' }}
          />
          <Area type="monotone" dataKey="value" stroke="none" fill="url(#trendAreaGradient)" />
          <Line
            type="monotone"
            dataKey="value"
            stroke="url(#trendLineGradient)"
            strokeWidth={4}
            dot={renderDot(lastIndex)}
            activeDot={{ r: 9 }}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
