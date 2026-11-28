import { useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { Empty } from '../components/ui'
import { TxRow } from '../components/TxRow'
import { formatRupiah, monthLabel, monthStart, shiftMonth } from '../lib/format'

export default function Transactions() {
  const { txs, categories, people, openTx } = useData()
  const [q, setQ] = useState('')
  const [month, setMonth] = useState('')
  const [cat, setCat] = useState('')
  const [kind, setKind] = useState('')
  const [who, setWho] = useState('')

  const months = Array.from({ length: 13 }, (_, i) => shiftMonth(new Date(), -i))
  const list = useMemo(() => txs.filter((t) =>
    (!month || t.spent_on.startsWith(month.slice(0, 7))) &&
    (!cat || t.category_id === cat) && (!kind || t.kind === kind) && (!who || t.person_id === who) &&
    (!q || t.title.toLowerCase().includes(q.toLowerCase()))), [txs, q, month, cat, kind, who])

  const income = list.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = list.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <section className="card">
      <div className="card-head">
        <h2>Catatan Transaksi</h2>
        <button className="primary" onClick={() => openTx()}>Catat Transaksi</button>
      </div>
      <div className="filters">
        <label>Cari<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Judul transaksi" /></label>
        <label>Bulan
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Semua bulan</option>
            {months.map((m) => <option key={monthStart(m)} value={monthStart(m)}>{monthLabel(m)}</option>)}
          </select>
        </label>
        <label>Kategori
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Semua kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Jenis
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Semua jenis</option>
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </label>
        <label>Anggota
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Semua anggota</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>
      <p className="muted totals">{list.length} transaksi. Pemasukan {formatRupiah(income)}, pengeluaran {formatRupiah(expense)}.</p>
      {list.length === 0 ? <Empty>Tidak ada transaksi yang cocok. Ubah filter atau catat transaksi baru.</Empty> : (
        <ul className="tx-list">{list.map((t) => <TxRow key={t.id} tx={t} actions />)}</ul>
      )}
    </section>
  )
}
