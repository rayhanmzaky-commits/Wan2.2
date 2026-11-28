import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Setup({ onReady }: { onReady: (id: string) => void }) {
  const [name, setName] = useState('')
  const [demo, setDemo] = useState(true)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { data, error } = await supabase.rpc('create_household', { p_name: name.trim(), p_demo: demo })
    setBusy(false)
    if (error) setError('Keluarga belum bisa dibuat. Coba lagi sebentar lagi.')
    else onReady(data as string)
  }

  async function join(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError('')
    const { data, error } = await supabase.rpc('join_household', { p_code: code })
    setBusy(false)
    if (error) setError('Kode undangan tidak ditemukan. Minta kode yang benar dari anggota keluarga.')
    else onReady(data as string)
  }

  return (
    <main className="center">
      <div className="panel">
        <h1>Mulai dari keluarga kamu</h1>
        <form className="form" onSubmit={create}>
          <label>Nama keluarga
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Keluarga Budi" required />
          </label>
          <label className="check-line">
            <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
            <span>Isi dengan data contoh supaya tampilan langsung hidup. Bisa dikosongkan kapan saja di Pengaturan.</span>
          </label>
          <button className="primary" disabled={busy}>Buat keluarga</button>
        </form>
        <hr />
        <form className="form" onSubmit={join}>
          <label>Sudah ada yang membuat? Masukkan kode undangan
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="a1b2c3d4" required />
          </label>
          <button disabled={busy}>Gabung</button>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </main>
  )
}
