import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase'
import {
  formatRupiah, monthLabel, monthStart, parseAmount, shiftMonth, shortDate, today,
} from './lib/format'

type Category = { id: string; name: string }
type Tx = {
  id: string; category_id: string | null; kind: 'expense' | 'income'
  amount: number; note: string; spent_on: string
}

type Props = { householdId: string; email: string; onSignOut: () => void }

export default function Dashboard({ householdId, email, onSignOut }: Props) {
  const [month, setMonth] = useState(() => shiftMonth(new Date(), 0))
  const [cats, setCats] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [txs, setTxs] = useState<Tx[]>([])
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<string | null>(null)

  const start = monthStart(month)
  const next = monthStart(shiftMonth(month, 1))

  const load = useCallback(async () => {
    const [c, b, t, h] = await Promise.all([
      supabase.from('categories').select('id,name').eq('household_id', householdId).order('name'),
      supabase.from('budgets').select('category_id,amount').eq('household_id', householdId).eq('month', start),
      supabase.from('transactions').select('id,category_id,kind,amount,note,spent_on')
        .eq('household_id', householdId).gte('spent_on', start).lt('spent_on', next)
        .order('spent_on', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('households').select('invite_code').eq('id', householdId).single(),
    ])
    if (c.error || b.error || t.error) {
      setError('Data belum bisa dimuat. Periksa koneksi, lalu muat ulang halaman.')
      return
    }
    setError('')
    setCats(c.data ?? [])
    setBudgets(Object.fromEntries((b.data ?? []).map((r) => [r.category_id, Number(r.amount)])))
    setTxs((t.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Tx[])
    setInviteCode(h.data?.invite_code ?? '')
  }, [householdId, start, next])

  useEffect(() => { void load() }, [load])

  const spentBy = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of txs) if (t.kind === 'expense' && t.category_id) m[t.category_id] = (m[t.category_id] ?? 0) + t.amount
    return m
  }, [txs])

  const income = txs.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0)
  const spent = txs.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0)
  const planned = Object.values(budgets).reduce((s, n) => s + n, 0)
  const left = planned - spent

  async function saveBudget(categoryId: string, amount: number) {
    const { error } = await supabase.from('budgets').upsert(
      { household_id: householdId, category_id: categoryId, month: start, amount },
      { onConflict: 'category_id,month' },
    )
    if (error) setError('Anggaran belum tersimpan. Coba simpan lagi.')
    else { setEditing(null); void load() }
  }

  async function addCategory() {
    const name = window.prompt('Nama amplop baru, misalnya Hiburan')?.trim()
    if (!name) return
    const { error } = await supabase.from('categories').insert({ household_id: householdId, name })
    if (error) setError('Amplop belum dibuat. Pastikan namanya belum dipakai.')
    else void load()
  }

  async function removeTx(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) setError('Transaksi belum terhapus. Coba lagi.')
    else void load()
  }

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? 'Tanpa amplop'

  return (
    <div className="shell">
      <header className="top">
        <div className="months">
          <button aria-label="Bulan sebelumnya" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <h2>{monthLabel(month)}</h2>
          <button aria-label="Bulan berikutnya" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        </div>
        <div className="who">
          <span className="muted">{email}</span>
          <button className="link" onClick={onSignOut}>Keluar</button>
        </div>
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      <section className="hero" aria-label="Ringkasan bulan ini">
        <p className="muted">{left >= 0 ? 'Sisa di semua amplop' : 'Kelebihan dari anggaran'}</p>
        <p className={`big ${left < 0 ? 'over' : ''}`}>{formatRupiah(Math.abs(left))}</p>
        <dl className="stats">
          <div><dt>Dianggarkan</dt><dd>{formatRupiah(planned)}</dd></div>
          <div><dt>Terpakai</dt><dd>{formatRupiah(spent)}</dd></div>
          <div><dt>Pemasukan</dt><dd>{formatRupiah(income)}</dd></div>
        </dl>
      </section>

      <section aria-labelledby="amplop">
        <div className="row">
          <h3 id="amplop">Amplop bulan ini</h3>
          <button onClick={addCategory}>Tambah amplop</button>
        </div>
        <div className="envelopes">
          {cats.map((c) => {
            const budget = budgets[c.id] ?? 0
            const used = spentBy[c.id] ?? 0
            const ratio = budget > 0 ? used / budget : used > 0 ? 2 : 0
            const level = ratio > 1 ? 'over' : ratio >= 0.75 ? 'warn' : 'ok'
            return (
              <article key={c.id} className={`env ${level}`} style={{ ['--fill' as string]: `${Math.min(ratio, 1) * 100}%` }}>
                <h4>{c.name}</h4>
                {editing === c.id ? (
                  <BudgetForm initial={budget} onSave={(n) => saveBudget(c.id, n)} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <p className="remain">
                      {budget === 0 && used === 0 ? 'Belum diatur' : formatRupiah(budget - used)}
                    </p>
                    <p className="muted small">
                      {budget === 0 ? 'Belum ada anggaran' : `terpakai ${formatRupiah(used)} dari ${formatRupiah(budget)}`}
                    </p>
                    <button className="link" onClick={() => setEditing(c.id)}>
                      {budget === 0 ? 'Atur anggaran' : 'Ubah anggaran'}
                    </button>
                  </>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <section className="split">
        <TxForm householdId={householdId} cats={cats} onAdded={load} onError={setError} />
        <div>
          <h3>Transaksi</h3>
          {txs.length === 0 ? (
            <p className="muted">Belum ada transaksi bulan ini. Catat yang pertama di sebelah.</p>
          ) : (
            <ul className="txs">
              {txs.map((t) => (
                <li key={t.id}>
                  <span className="date">{shortDate(t.spent_on)}</span>
                  <span className="what">
                    {t.note || (t.kind === 'income' ? 'Pemasukan' : catName(t.category_id))}
                    <small className="muted">{t.kind === 'income' ? 'Pemasukan' : catName(t.category_id)}</small>
                  </span>
                  <span className={t.kind === 'income' ? 'in' : 'out'}>
                    {t.kind === 'income' ? '+' : '−'}{formatRupiah(t.amount)}
                  </span>
                  <button className="link" aria-label={`Hapus transaksi ${t.note || catName(t.category_id)}`} onClick={() => removeTx(t.id)}>Hapus</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <footer className="foot muted">
        Kode undangan keluarga: <code>{inviteCode}</code>. Bagikan ke anggota lain supaya bisa bergabung.
      </footer>
    </div>
  )
}

function BudgetForm({ initial, onSave, onCancel }: { initial: number; onSave: (n: number) => void; onCancel: () => void }) {
  const [value, setValue] = useState(initial ? String(initial) : '')
  return (
    <form className="inline" onSubmit={(e) => { e.preventDefault(); onSave(parseAmount(value)) }}>
      <input autoFocus inputMode="numeric" aria-label="Anggaran bulan ini" placeholder="1500000" value={value} onChange={(e) => setValue(e.target.value)} />
      <button className="primary">Simpan</button>
      <button type="button" className="link" onClick={onCancel}>Batal</button>
    </form>
  )
}

function TxForm({ householdId, cats, onAdded, onError }: {
  householdId: string; cats: Category[]; onAdded: () => void; onError: (m: string) => void
}) {
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = parseAmount(amount)
    if (n <= 0) return onError('Isi jumlah lebih dari nol.')
    if (kind === 'expense' && !categoryId) return onError('Pilih amplop untuk pengeluaran ini.')
    setBusy(true)
    const { error } = await supabase.from('transactions').insert({
      household_id: householdId, kind, amount: n, note: note.trim(), spent_on: date,
      category_id: kind === 'expense' ? categoryId : null,
    })
    setBusy(false)
    if (error) return onError('Transaksi belum tersimpan. Coba lagi.')
    onError('')
    setAmount(''); setNote('')
    onAdded()
  }

  return (
    <form className="panel tx-form" onSubmit={submit}>
      <h3>Catat transaksi</h3>
      <div className="seg" role="group" aria-label="Jenis transaksi">
        <button type="button" aria-pressed={kind === 'expense'} onClick={() => setKind('expense')}>Pengeluaran</button>
        <button type="button" aria-pressed={kind === 'income'} onClick={() => setKind('income')}>Pemasukan</button>
      </div>
      <label>Jumlah
        <input inputMode="numeric" placeholder="50000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      {kind === 'expense' && (
        <label>Amplop
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">Pilih amplop</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      <label>Tanggal
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label>Catatan
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Belanja pasar" />
      </label>
      <button className="primary" disabled={busy}>Simpan transaksi</button>
    </form>
  )
}
