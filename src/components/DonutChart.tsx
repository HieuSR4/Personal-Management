// React import not required with modern JSX transform
import { useState } from 'react'

type DonutDatum = {
  label: string
  value: number
  color: string
}

export function DonutChart({
  data,
  size = 160,
  strokeWidth = 22,
}: {
  data: DonutDatum[]
  size?: number
  strokeWidth?: number
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const total = data.reduce((s, d) => s + (d.value || 0), 0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  let acc = 0
  const segments = total
    ? data.map((d, idx) => {
        const fraction = d.value / total
        const dash = fraction * circumference
        const gap = circumference - dash
        const strokeDasharray = `${dash} ${gap}`
        const strokeDashoffset = -acc
        acc += dash
        const isActive = hoveredIndex === null || hoveredIndex === idx
        return (
          <circle
            key={idx}
            r={radius}
            cx={size / 2}
            cy={size / 2}
            fill="transparent"
            stroke={d.color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            onPointerEnter={() => setHoveredIndex(idx)}
            onPointerLeave={() => setHoveredIndex(null)}
            style={{
              cursor: 'pointer',
              transition: 'opacity 0.2s ease-in-out',
              opacity: isActive ? 1 : 0.35,
            }}
          />
        )
      })
    : null

  const hoveredDatum = hoveredIndex !== null ? data[hoveredIndex] : null
  const displayLabel = hoveredDatum ? hoveredDatum.label : 'Tổng chi'
  const displayValue = hoveredDatum ? hoveredDatum.value : total

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      onPointerLeave={() => setHoveredIndex(null)}
    >
      <circle
        r={radius}
        cx={size / 2}
        cy={size / 2}
        fill="transparent"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
        opacity={0.35}
      />
      {segments}
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        style={{ fontWeight: 700, fontSize: 14, fill: '#cbd5e1' }}
      >
        <tspan x="50%" dy="-0.2em" style={{ fontWeight: 500, fontSize: 12, fill: '#94a3b8' }}>
          {displayLabel}
        </tspan>
        <tspan x="50%" dy="1.4em">
          {displayValue.toLocaleString('vi-VN')} VND
        </tspan>
      </text>
    </svg>
  )
}
