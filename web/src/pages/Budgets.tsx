import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useData } from '../lib/data'
import { Bar, Empty } from '../components/ui'
import { budgetLevel, formatRupiah, inMonth, levelLabel, monthLabel, monthStart, parseAmount, shiftMonth } from '../lib/format'
import type { Category } from '../lib/types'

export default function Budgets() {
  const { categories, budgets, txs, householdId, reload, setError } = useData()
  const [month, setMonth] = useState(() => shiftMonth(new Date(), 0))
  const [newName, setNewName] = useState('')
  const key = monthStart(month)
  const limitOf = (id: string) => budgets.find((b) => b.category_id === id && b.month === key)?.amount ?? 0
  const usedOf = (id: string) => txs.filter((t) => t.kind === 'expense' && t.category_id === id && inMonth(t.spent_on, month)).reduce((s, t) => s + t.amount, 0)

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const { error } = await supabase.from('categories').insert({ household_id: householdId, name: newName.trim() })
    if (error) return setError('Pos belum dibuat. Pastikan namanya belum dipakai.')
    setNewName(''); void reload()
  }

  async function copyLastMonth() {
    const prev = monthStart(shiftMonth(month, -1))
    const rows = budgets.filter((b) => b.month === prev && !budgets.some((x) => x.category_id === b.category_id && x.month === key))
      .map((b) => ({ household_id: householdId, category_id: b.category_id, month: key, amount: b.amount }))
    if (rows.length === 0) return setError('Tidak ada anggaran bulan lalu yang bisa disalin.')
    const { error } = await supabase.from('budgets').insert(rows)
    if (error) return setError('Anggaran belum tersalin. Coba lagi.')
    setError(''); void reload()
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Pos Anggaran</h2>
        <div className="months">
          <button className="icon-btn" aria-label="Bulan sebelumnya" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <strong>{monthLabel(month)}</strong>
          <button className="icon-btn" aria-label="Bulan berikutnya" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        </div>
      </div>
      <p className="muted">Atur batas belanja tiap pos untuk bulan ini. Warna bar berubah otomatis: hijau aman, kuning waspada (75%), merah melebihi anggaran.</p>
      <div className="row-actions">
        <form className="inline-form" onSubmit={addCategory}>
          <input aria-label="Nama pos baru" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Pos baru, misalnya Kesehatan" />
          <button className="primary">Tambah pos</button>
        </form>
        <button onClick={copyLastMonth}>Salin dari bulan lalu</button>
      </div>
      {categories.length === 0 ? <Empty>Belum ada pos anggaran.</Empty> : (
        <ul className="budget-edit">
          {categories.map((c) => (
            <BudgetRow key={`${c.id}-${key}-${limitOf(c.id)}`} cat={c} month={key} limit={limitOf(c.id)} used={usedOf(c.id)} />
          ))}
        </ul>
      )}
    </section>
  )
}

function BudgetRow({ cat, month, limit, used }: { cat: Category; month: string; limit: number; used: number }) {
  const { householdId, reload, setError } = useData()
  const [value, setValue] = useState(limit ? String(limit) : '')
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(cat.name)
  const level = budgetLevel(used, limit)
  const dirty = parseAmount(value) !== limit

  async function save() {
    const { error } = await supabase.from('budgets').upsert(
      { household_id: householdId, category_id: cat.id, month, amount: parseAmount(value) },
      { onConflict: 'category_id,month' })
    if (error) return setError('Anggaran belum tersimpan. Coba lagi.')
    setError(''); void reload()
  }
  async function rename(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('categories').update({ name: name.trim() }).eq('id', cat.id)
    if (error) return setError('Nama belum berubah. Pastikan belum dipakai pos lain.')
    setRenaming(false); void reload()
  }
  async function remove() {
    if (!window.confirm(`Hapus pos "${cat.name}"? Transaksi lamanya tetap ada tapi tanpa kategori.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', cat.id)
    if (error) return setError('Pos belum terhapus. Coba lagi.')
    void reload()
  }

  return (
    <li>
      <div className="budget-top">
        {renaming ? (
          <form className="inline-form" onSubmit={rename}>
            <input aria-label="Nama pos" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="primary">Simpan</button>
            <button type="button" className="link" onClick={() => setRenaming(false)}>Batal</button>
          </form>
        ) : <strong>{cat.name}</strong>}
        <span className="budget-nums">{formatRupiah(used)} / {limit ? formatRupiah(limit) : 'belum diatur'}</span>
      </div>
      <Bar used={used} limit={limit} label={cat.name} />
      <div className="budget-bottom">
        <small className={`status lvl-${level}`}>{levelLabel[level]}</small>
        <span className="budget-controls">
          <input aria-label={`Batas anggaran ${cat.name}`} inputMode="numeric" placeholder="Batas bulanan" value={value} onChange={(e) => setValue(e.target.value)} />
          <button className="primary" disabled={!dirty} onClick={save}>Simpan</button>
          <button className="link" onClick={() => setRenaming(true)}>Ubah nama</button>
          <button className="link danger" onClick={remove}>Hapus</button>
        </span>
      </div>
    </li>
  )
}
