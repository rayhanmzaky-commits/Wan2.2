import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useData } from '../lib/data'
import { Empty, Modal } from '../components/ui'
import { formatRupiah, monthStart, parseAmount } from '../lib/format'
import type { Bill } from '../lib/types'

function dueText(due: number, paid: boolean, now: Date) {
  if (paid) return { text: 'Sudah dibayar', cls: 'paid' }
  const diff = due - now.getDate()
  if (diff < 0) return { text: `Terlambat ${-diff} hari`, cls: 'late' }
  if (diff === 0) return { text: 'Jatuh tempo hari ini', cls: 'soon' }
  if (diff <= 5) return { text: `${diff} hari lagi`, cls: 'soon' }
  return { text: `${diff} hari lagi`, cls: 'ok-due' }
}

export default function Bills() {
  const { bills, active, reload, setError } = useData()
  const [edit, setEdit] = useState<Bill | 'new' | null>(null)
  const now = new Date()
  const key = monthStart(now)
  const paidThisMonth = (b: Bill) => b.paid_month === key
  const total = bills.reduce((s, b) => s + b.amount, 0)
  const paid = bills.filter(paidThisMonth).reduce((s, b) => s + b.amount, 0)

  async function toggle(b: Bill) {
    const { error } = paidThisMonth(b)
      ? await supabase.rpc('unpay_bill', { p_bill: b.id, p_month: key })
      : await supabase.rpc('pay_bill', { p_bill: b.id, p_month: key, p_person: active?.id ?? null })
    if (error) return setError('Status tagihan belum berubah. Coba lagi.')
    setError(''); void reload()
  }

  return (
    <>
      <div className="page-head">
        <h2>Tagihan Bulanan</h2>
        <button className="primary" onClick={() => setEdit('new')}>Tagihan baru</button>
      </div>
      <section className="cards two-cards">
        <article className="card sum blue"><p>Sudah dibayar bulan ini</p><strong>{formatRupiah(paid)}</strong></article>
        <article className="card sum orange"><p>Masih harus dibayar</p><strong>{formatRupiah(total - paid)}</strong></article>
      </section>
      {bills.length === 0 ? <Empty>Belum ada tagihan rutin. Tambahkan listrik, internet, air, atau iuran.</Empty> : (
        <ul className="card bill-list">
          {[...bills].sort((a, b) => a.due_day - b.due_day).map((b) => {
            const isPaid = paidThisMonth(b)
            const d = dueText(b.due_day, isPaid, now)
            return (
              <li key={b.id} className={isPaid ? 'is-paid' : ''}>
                <label className="check">
                  <input type="checkbox" checked={isPaid} onChange={() => toggle(b)} aria-label={`Sudah dibayar: ${b.name}`} />
                  <span className="box" aria-hidden="true" />
                </label>
                <span className="bill-what"><strong>{b.name}</strong><small className="muted">Jatuh tempo tanggal {b.due_day}</small></span>
                <span className={`due ${d.cls}`}>{d.text}</span>
                <span className="bill-amount">{formatRupiah(b.amount)}</span>
                <button className="link" onClick={() => setEdit(b)}>Ubah</button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="muted small">Mencentang "Sudah dibayar" otomatis mencatat pengeluaran atas nama {active?.name ?? 'anggota aktif'}. Menghilangkan centang menghapus catatan itu.</p>
      {edit && <BillModal bill={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </>
  )
}

function BillModal({ bill, onClose }: { bill: Bill | null; onClose: () => void }) {
  const { householdId, categories, reload, setError } = useData()
  const [name, setName] = useState(bill?.name ?? '')
  const [amount, setAmount] = useState(bill ? String(bill.amount) : '')
  const [day, setDay] = useState(String(bill?.due_day ?? 1))
  const [cat, setCat] = useState(bill?.category_id ?? '')
  const [err, setErr] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const d = Number(day)
    if (parseAmount(amount) <= 0) return setErr('Isi nominal lebih dari nol.')
    if (!(d >= 1 && d <= 31)) return setErr('Tanggal jatuh tempo antara 1 sampai 31.')
    const row = { name: name.trim(), amount: parseAmount(amount), due_day: d, category_id: cat || null }
    const { error } = bill
      ? await supabase.from('bills').update(row).eq('id', bill.id)
      : await supabase.from('bills').insert({ ...row, household_id: householdId })
    if (error) return setErr('Tagihan belum tersimpan. Coba lagi.')
    setError(''); await reload(); onClose()
  }
  async function remove() {
    if (!bill || !window.confirm(`Hapus tagihan "${bill.name}"?`)) return
    const { error } = await supabase.from('bills').delete().eq('id', bill.id)
    if (error) return setErr('Tagihan belum terhapus. Coba lagi.')
    await reload(); onClose()
  }
  return (
    <Modal title={bill ? 'Ubah tagihan' : 'Tagihan baru'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>Nama tagihan<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Listrik PLN" required /></label>
        <label>Nominal (Rp)<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1100000" required /></label>
        <div className="two">
          <label>Jatuh tempo tanggal<input type="number" min={1} max={31} value={day} onChange={(e) => setDay(e.target.value)} required /></label>
          <label>Kategori
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Tanpa kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="primary">Simpan tagihan</button>
        {bill && <button type="button" className="link danger" onClick={remove}>Hapus tagihan ini</button>}
      </form>
    </Modal>
  )
}
