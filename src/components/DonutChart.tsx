// React import not required with modern JSX transform

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
          />
        )
      })
    : null

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
        {total.toLocaleString('vi-VN')} VND
      </text>
    </svg>
  )
}
