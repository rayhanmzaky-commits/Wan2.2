import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useData } from '../lib/data'
import { Empty, Modal } from '../components/ui'
import { formatRupiah, parseAmount, shortDate } from '../lib/format'
import type { Goal } from '../lib/types'

export default function Goals() {
  const { goals } = useData()
  const [edit, setEdit] = useState<Goal | 'new' | null>(null)
  const [deposit, setDeposit] = useState<Goal | null>(null)
  return (
    <>
      <div className="page-head">
        <h2>Target Tabungan</h2>
        <button className="primary" onClick={() => setEdit('new')}>Target baru</button>
      </div>
      {goals.length === 0 ? <Empty>Belum ada target tabungan. Buat yang pertama, misalnya Dana Darurat.</Empty> : (
        <div className="goal-grid">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.saved / g.target) * 100))
            return (
              <article className="card goal" key={g.id}>
                <h3>{g.name}</h3>
                <p className="goal-nums"><strong>{formatRupiah(g.saved)}</strong> <span className="muted">dari {formatRupiah(g.target)}</span></p>
                <div className="bar lvl-safe" role="progressbar" aria-label={`Progres ${g.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{ width: `${pct}%` }} /></div>
                <p className="muted small">{pct >= 100 ? 'Target tercapai' : `${pct}% tercapai, kurang ${formatRupiah(g.target - g.saved)}`}{g.deadline ? `. Tenggat ${shortDate(g.deadline)}` : ''}</p>
                <div className="goal-actions">
                  <button className="primary" onClick={() => setDeposit(g)}>Tambah tabungan</button>
                  <button className="link" onClick={() => setEdit(g)}>Ubah</button>
                </div>
              </article>
            )
          })}
        </div>
      )}
      {edit && <GoalModal goal={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {deposit && <DepositModal goal={deposit} onClose={() => setDeposit(null)} />}
    </>
  )
}

function GoalModal({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { householdId, reload, setError } = useData()
  const [name, setName] = useState(goal?.name ?? '')
  const [target, setTarget] = useState(goal ? String(goal.target) : '')
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')
  const [err, setErr] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (parseAmount(target) <= 0) return setErr('Isi target lebih dari nol.')
    const row = { name: name.trim(), target: parseAmount(target), deadline: deadline || null }
    const { error } = goal
      ? await supabase.from('savings_goals').update(row).eq('id', goal.id)
      : await supabase.from('savings_goals').insert({ ...row, household_id: householdId })
    if (error) return setErr('Target belum tersimpan. Coba lagi.')
    setError(''); await reload(); onClose()
  }
  async function remove() {
    if (!goal || !window.confirm(`Hapus target "${goal.name}"?`)) return
    const { error } = await supabase.from('savings_goals').delete().eq('id', goal.id)
    if (error) return setErr('Target belum terhapus. Coba lagi.')
    await reload(); onClose()
  }
  return (
    <Modal title={goal ? 'Ubah target' : 'Target tabungan baru'} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>Nama target<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Liburan Keluarga" required /></label>
        <label>Jumlah target (Rp)<input inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="15000000" required /></label>
        <label>Tenggat (boleh dikosongkan)<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="primary">Simpan target</button>
        {goal && <button type="button" className="link danger" onClick={remove}>Hapus target ini</button>}
      </form>
    </Modal>
  )
}

function DepositModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { reload } = useData()
  const [amount, setAmount] = useState('')
  const [err, setErr] = useState('')
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const n = parseAmount(amount)
    if (n <= 0) return setErr('Isi nominal lebih dari nol.')
    const { error } = await supabase.rpc('add_to_goal', { p_goal: goal.id, p_amount: n })
    if (error) return setErr('Tabungan belum bertambah. Coba lagi.')
    await reload(); onClose()
  }
  return (
    <Modal title={`Tambah tabungan: ${goal.name}`} onClose={onClose}>
      <form className="form" onSubmit={save}>
        <label>Nominal (Rp)<input inputMode="numeric" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500000" required /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="primary">Tambahkan</button>
      </form>
    </Modal>
  )
}
