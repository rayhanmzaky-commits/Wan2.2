import { useState } from 'react'
import { useData } from '../lib/data'
import { Empty } from '../components/ui'
import { formatJuta, formatRupiah, inMonth, monthLabel, monthShort, monthStart, shiftMonth } from '../lib/format'

export const PALETTE = ['#0f8f87', '#e0792b', '#3b82c4', '#6bb38a', '#b8860b', '#8a6fc7', '#d0577a', '#5c6f7a']

function niceMax(v: number) {
  if (v <= 0) return 1_000_000
  const step = 10 ** Math.floor(Math.log10(v))
  return Math.ceil(v / step) * step
}

export default function Reports() {
  const { txs, categories } = useData()
  const now = new Date()
  const [pieMonth, setPieMonth] = useState(monthStart(now))

  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(now, i - 5))
  const series = months.map((m) => {
    const list = txs.filter((t) => inMonth(t.spent_on, m))
    return {
      m,
      income: list.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0),
      expense: list.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  })
  const top = niceMax(Math.max(...series.flatMap((s) => [s.income, s.expense])))
  const W = 640, H = 280, L = 52, B = 34, T = 12
  const bw = (W - L) / series.length
  const y = (v: number) => T + (H - B - T) * (1 - v / top)

  const pm = new Date(pieMonth + 'T00:00:00')
  const slices = categories
    .map((c, i) => ({ name: c.name, color: PALETTE[i % PALETTE.length], value: txs.filter((t) => t.kind === 'expense' && t.category_id === c.id && inMonth(t.spent_on, pm)).reduce((s, t) => s + t.amount, 0) }))
    .filter((s) => s.value > 0)
  const total = slices.reduce((s, x) => s + x.value, 0)
  const R = 54, C = 2 * Math.PI * R
  let offset = 0

  return (
    <>
      <div className="page-head"><h2>Laporan</h2></div>
      <section className="card" aria-labelledby="bars">
        <div className="card-head">
          <h3 id="bars">Pemasukan vs pengeluaran, 6 bulan terakhir</h3>
          <span className="legend"><i style={{ background: '#3b82c4' }} /> Pemasukan <i style={{ background: '#e0792b' }} /> Pengeluaran</span>
        </div>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
          aria-label={`Grafik batang. ${series.map((s) => `${monthShort(s.m)}: pemasukan ${formatRupiah(s.income)}, pengeluaran ${formatRupiah(s.expense)}`).join('. ')}`}>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={L} x2={W} y1={y(top * f)} y2={y(top * f)} stroke="var(--line)" />
              <text x={L - 8} y={y(top * f) + 4} textAnchor="end" className="axis">{formatJuta(top * f)}</text>
            </g>
          ))}
          {series.map((s, i) => {
            const x0 = L + i * bw + bw * 0.16
            const w = bw * 0.32
            return (
              <g key={s.m.toISOString()}>
                <rect x={x0} y={y(s.income)} width={w} height={H - B - y(s.income)} rx="3" fill="#3b82c4"><title>{`${monthLabel(s.m)}: pemasukan ${formatRupiah(s.income)}`}</title></rect>
                <rect x={x0 + w + 4} y={y(s.expense)} width={w} height={H - B - y(s.expense)} rx="3" fill="#e0792b"><title>{`${monthLabel(s.m)}: pengeluaran ${formatRupiah(s.expense)}`}</title></rect>
                <text x={L + i * bw + bw / 2} y={H - 10} textAnchor="middle" className="axis">{monthShort(s.m)}</text>
              </g>
            )
          })}
        </svg>
      </section>

      <section className="card" aria-labelledby="pie">
        <div className="card-head">
          <h3 id="pie">Porsi pengeluaran per kategori</h3>
          <select aria-label="Pilih bulan" value={pieMonth} onChange={(e) => setPieMonth(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => shiftMonth(now, -i)).map((m) => <option key={monthStart(m)} value={monthStart(m)}>{monthLabel(m)}</option>)}
          </select>
        </div>
        {slices.length === 0 ? <Empty>Belum ada pengeluaran di {monthLabel(pm)}.</Empty> : (
          <div className="pie-wrap">
            <svg className="pie" viewBox="0 0 160 160" role="img" aria-label={`Diagram lingkaran pengeluaran ${monthLabel(pm)}, total ${formatRupiah(total)}`}>
              <g transform="rotate(-90 80 80)">
                {slices.map((s) => {
                  const len = (s.value / total) * C
                  const el = <circle key={s.name} cx="80" cy="80" r={R} fill="none" stroke={s.color} strokeWidth="26" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
                  offset += len
                  return el
                })}
              </g>
              <text x="80" y="76" textAnchor="middle" className="pie-label">Total</text>
              <text x="80" y="94" textAnchor="middle" className="pie-total">{formatJuta(total)}</text>
            </svg>
            <ul className="pie-legend">
              {slices.sort((a, b) => b.value - a.value).map((s) => (
                <li key={s.name}><i style={{ background: s.color }} /><span>{s.name}</span><strong>{formatRupiah(s.value)}</strong><small className="muted">{Math.round((s.value / total) * 100)}%</small></li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  )
}
