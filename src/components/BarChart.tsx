// React import not required with modern JSX transform

type BarDatum = {
  label: string
  value: number
  color: string
}

export function BarChart({ data, height = 140 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
      {data.map((d) => {
        const h = Math.round((d.value / max) * (height - 24))
        return (
          <div key={d.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              title={`${d.label}: ${d.value.toLocaleString('vi-VN')} VND`}
              style={{
                width: 26,
                height: h,
                background: d.color,
                borderRadius: 6,
                boxShadow: '0 6px 16px -8px rgba(0,0,0,0.25)',
              }}
            />
            <span style={{ fontSize: 12, color: '#64748b' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}
