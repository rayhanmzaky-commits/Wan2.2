import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    if (mode === 'masuk') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email atau kata sandi salah. Periksa lagi, lalu coba masuk.')
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else if (!data.session) setInfo('Akun dibuat. Buka email kamu dan klik tautan konfirmasi, lalu masuk.')
    }
    setBusy(false)
  }

  return (
    <main className="center">
      <form className="panel form" onSubmit={submit}>
        <h1>Keuangan Keluarga</h1>
        <p className="muted">Catat uang masuk dan keluar bersama keluarga, pantau anggaran, dan capai target tabungan.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Kata sandi
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="ok" role="status">{info}</p>}
        <button className="primary" disabled={busy}>{mode === 'masuk' ? 'Masuk' : 'Buat akun'}</button>
        <button type="button" className="link" onClick={() => setMode(mode === 'masuk' ? 'daftar' : 'masuk')}>
          {mode === 'masuk' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </button>
      </form>
    </main>
  )
}
