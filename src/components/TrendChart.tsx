import type { ReactNode } from 'react'

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

const SVG_WIDTH = 960
const DEFAULT_HEIGHT = 360

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
    return `${Number(value / 1_000_000_000).toFixed(value % 1_000_000_000 === 0 ? 0 : 1)} tỷ`
  }
  if (value >= 1_000_000) {
    return `${Number(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)} triệu`
  }
  if (value >= 1_000) {
    return `${Number(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)} nghìn`
  }
  return value.toLocaleString('vi-VN')
}

export function TrendChart({ points, height = DEFAULT_HEIGHT }: TrendChartProps) {
  if (!points.length) return null

  const padding = { top: 48, right: 56, bottom: 96, left: 110 }
  const chartHeight = height - padding.top - padding.bottom
  const chartWidth = SVG_WIDTH - padding.left - padding.right
  const values = points.map((point) => point.value)
  const maxValue = Math.max(...values, 0)
  const yMax = niceMax(maxValue || 1)
  const baseLineY = padding.top + chartHeight
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0

  const xPositions = points.map((_, index) =>
    points.length > 1 ? padding.left + stepX * index : padding.left + chartWidth / 2,
  )

  const yScale = (value: number) => {
    if (!Number.isFinite(value) || yMax === 0) return baseLineY
    return padding.top + chartHeight - (value / yMax) * chartHeight
  }

  const tickCount = 4
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const value = (yMax / tickCount) * index
    return { value, y: yScale(value) }
  })

  const labelEvery = points.length > 9 ? Math.ceil(points.length / 9) : 1
  const lastIndex = points.length - 1

  const linePath = points
    .map((point, index) => {
      const x = xPositions[index]
      const y = yScale(point.value)
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const areaPath =
    points.length > 1
      ? `${linePath} L ${xPositions[lastIndex]} ${baseLineY} L ${xPositions[0]} ${baseLineY} Z`
      : `M ${padding.left} ${baseLineY} L ${xPositions[0]} ${yScale(points[0].value)} L ${padding.left + chartWidth} ${baseLineY} Z`

  return (
    <svg
      viewBox={`0 0 ${SVG_WIDTH} ${height}`}
      className="trend-chart"
      role="img"
      aria-label="Biểu đồ xu hướng chi tiêu"
    >
      <defs>
        <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="trendLineGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>

      <rect
        x={padding.left}
        y={padding.top}
        width={chartWidth}
        height={chartHeight}
        fill="rgba(15, 23, 42, 0.55)"
        stroke="rgba(148, 163, 184, 0.18)"
        strokeWidth={1}
        rx={18}
      />

      {ticks.map((tick, index) => (
        <g key={`tick-${tick.value}`}> 
          <line
            x1={padding.left}
            x2={padding.left + chartWidth}
            y1={tick.y}
            y2={tick.y}
            stroke={index === tickCount ? 'rgba(148, 163, 184, 0.35)' : 'rgba(148, 163, 184, 0.16)'}
            strokeDasharray={index === tickCount ? undefined : '4 10'}
          />
          <text
            x={padding.left - 18}
            y={tick.y}
            textAnchor="end"
            alignmentBaseline="middle"
            style={{ fill: '#94a3b8', fontSize: 26, fontWeight: 600 }}
          >
            {formatTick(tick.value)}
          </text>
        </g>
      ))}

      {points.length > 1 && (
        <path d={areaPath} fill="url(#trendAreaGradient)" opacity={0.9} />
      )}
      {points.length > 1 && (
        <path
          d={linePath}
          fill="none"
          stroke="url(#trendLineGradient)"
          strokeWidth={6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {points.map((point, index) => {
        const x = xPositions[index]
        const y = yScale(point.value)
        const isLast = index === lastIndex
        return (
          <g key={point.label}>
            <circle
              cx={x}
              cy={y}
              r={isLast ? 10 : 8}
              fill={isLast ? '#38bdf8' : '#6366f1'}
              stroke="#0f172a"
              strokeWidth={isLast ? 4 : 3}
            >
              <title>{`${point.label}: ${point.value.toLocaleString('vi-VN')} VND`}</title>
            </circle>
            {point.annotation}
          </g>
        )
      })}

      {points.map((point, index) => {
        if (index % labelEvery !== 0) return null
        const x = xPositions[index]
        return (
          <text
            key={`xlabel-${point.label}`}
            x={x}
            y={baseLineY + 40}
            textAnchor="middle"
            style={{ fill: '#94a3b8', fontSize: 26, fontWeight: 600 }}
          >
            {point.label}
          </text>
        )
      })}
    </svg>
  )
}