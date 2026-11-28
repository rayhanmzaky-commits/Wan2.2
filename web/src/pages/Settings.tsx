import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useData } from '../lib/data'
import { Avatar } from '../components/ui'
import { PALETTE } from './Reports'
import type { Person } from '../lib/types'

export default function Settings() {
  const { householdId, householdName, inviteCode, people, txs, email, signOut, reload, setError } = useData()
  const [name, setName] = useState(householdName)
  const [msg, setMsg] = useState('')
  const [newPerson, setNewPerson] = useState('')

  async function saveName(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('households').update({ name: name.trim() }).eq('id', householdId)
    if (error) return setError('Nama keluarga belum tersimpan. Coba lagi.')
    setMsg('Nama keluarga tersimpan.'); void reload()
  }
  async function addPerson(e: React.FormEvent) {
    e.preventDefault()
    if (!newPerson.trim()) return
    const { error } = await supabase.from('people').insert({
      household_id: householdId, name: newPerson.trim(), role: newPerson.trim(),
      color: PALETTE[people.length % PALETTE.length], sort: people.length,
    })
    if (error) return setError('Anggota belum ditambahkan. Coba lagi.')
    setNewPerson(''); void reload()
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(inviteCode); setMsg('Kode undangan disalin.') } catch { setMsg('Salin kode secara manual.') }
  }
  async function loadDemo() {
    const { error } = await supabase.rpc('load_demo_data', { p_household: householdId })
    if (error) return setError('Data contoh belum bisa dimuat. Coba lagi.')
    setMsg('Data contoh dimuat.'); void reload()
  }
  async function reset() {
    if (!window.confirm('Hapus SEMUA transaksi, anggaran, tagihan, dan target tabungan keluarga ini? Ini tidak bisa dibatalkan.')) return
    if (!window.confirm('Yakin? Data akan hilang permanen.')) return
    const { error } = await supabase.rpc('reset_household_data', { p_household: householdId })
    if (error) return setError('Data belum terhapus. Coba lagi.')
    setMsg('Semua data keuangan dikosongkan.'); void reload()
  }

  return (
    <>
      <div className="page-head"><h2>Pengaturan</h2></div>
      {msg && <p className="banner ok" role="status">{msg}</p>}

      <section className="card">
        <h3>Keluarga</h3>
        <form className="inline-form" onSubmit={saveName}>
          <input aria-label="Nama keluarga" value={name} onChange={(e) => setName(e.target.value)} required />
          <button className="primary">Simpan nama</button>
        </form>
        <p className="muted">Kode undangan: <code>{inviteCode}</code> <button className="link" onClick={copyCode}>Salin</button></p>
        <p className="muted small">Bagikan kode ini ke anggota keluarga yang akan membuat akun sendiri, lalu memilih Gabung.</p>
      </section>

      <section className="card">
        <h3>Anggota keluarga</h3>
        <p className="muted small">Profil ini dipakai untuk menandai siapa yang mencatat transaksi.</p>
        <ul className="people-list">{people.map((p) => <PersonRow key={p.id} p={p} canDelete={people.length > 1} />)}</ul>
        <form className="inline-form" onSubmit={addPerson}>
          <input aria-label="Nama anggota baru" value={newPerson} onChange={(e) => setNewPerson(e.target.value)} placeholder="Nama anggota baru, misalnya Nenek" />
          <button className="primary">Tambah anggota</button>
        </form>
      </section>

      <section className="card">
        <h3>Data</h3>
        {txs.length === 0 && <p><button onClick={loadDemo}>Muat data contoh</button> <span className="muted small">Mengisi contoh keluarga Indonesia supaya tampilan langsung hidup.</span></p>}
        <p><button className="danger-btn" onClick={reset}>Kosongkan semua data keuangan</button> <span className="muted small">Pos anggaran dan anggota keluarga tetap ada.</span></p>
      </section>

      <section className="card">
        <h3>Akun</h3>
        <p className="muted">Masuk sebagai {email}</p>
        <button onClick={signOut}>Keluar</button>
      </section>
    </>
  )
}

function PersonRow({ p, canDelete }: { p: Person; canDelete: boolean }) {
  const { reload, setError } = useData()
  const [name, setName] = useState(p.name)
  const dirty = name.trim() !== p.name

  async function save() {
    const { error } = await supabase.from('people').update({ name: name.trim() }).eq('id', p.id)
    if (error) return setError('Nama belum tersimpan. Coba lagi.')
    void reload()
  }
  async function color(c: string) {
    const { error } = await supabase.from('people').update({ color: c }).eq('id', p.id)
    if (error) return setError('Warna belum berubah. Coba lagi.')
    void reload()
  }
  async function remove() {
    if (!window.confirm(`Hapus profil ${p.name}? Transaksi lamanya tetap ada tapi tanpa nama.`)) return
    const { error } = await supabase.from('people').delete().eq('id', p.id)
    if (error) return setError('Profil belum terhapus. Coba lagi.')
    void reload()
  }
  return (
    <li>
      <Avatar person={p} />
      <input aria-label={`Nama ${p.role}`} value={name} onChange={(e) => setName(e.target.value)} />
      <span className="swatches" role="group" aria-label={`Warna ${p.name}`}>
        {PALETTE.slice(0, 6).map((c) => (
          <button key={c} className={`swatch ${p.color === c ? 'on' : ''}`} style={{ background: c }} aria-label={`Warna ${c}`} aria-pressed={p.color === c} onClick={() => color(c)} />
        ))}
      </span>
      {dirty && <button className="primary" onClick={save}>Simpan</button>}
      {canDelete && <button className="link danger" onClick={remove}>Hapus</button>}
    </li>
  )
}
