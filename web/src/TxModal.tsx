import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { useData } from './lib/data'
import { Icon } from './lib/icons'
import { Modal } from './components/ui'
import { formatRupiah, parseAmount, today } from './lib/format'

const MAX_BYTES = 6 * 1024 * 1024
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }

/** Kecilkan foto supaya cepat diunggah dan dibaca; PDF dipakai apa adanya. */
async function prepare(file: File): Promise<{ blob: Blob; mime: string }> {
  if (file.type === 'application/pdf') return { blob: file, mime: file.type }
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
    if (blob) return { blob, mime: 'image/jpeg' }
  } catch { /* format tidak bisa dikecilkan, pakai aslinya */ }
  return { blob: file, mime: file.type }
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

export default function TxModal() {
  const { txEditor, closeTx, categories, people, active, householdId, reload, setError } = useData()
  const editing = txEditor?.tx ?? null
  const [mode, setMode] = useState<'scan' | 'manual'>(editing ? 'manual' : 'scan')
  const [kind, setKind] = useState<'expense' | 'income'>(editing?.kind ?? 'expense')
  const [title, setTitle] = useState(editing?.title ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [date, setDate] = useState(editing?.spent_on ?? today())
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? '')
  const [personId, setPersonId] = useState(editing?.person_id ?? active?.id ?? '')
  const [file, setFile] = useState<{ blob: Blob; mime: string } | null>(null)
  const [preview, setPreview] = useState('')
  const [scanning, setScanning] = useState(false)
  const [note, setNote] = useState('')
  const [scanError, setScanError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [drag, setDrag] = useState(false)
  const camRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (preview.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])

  async function handleFile(f: File | undefined) {
    if (!f) return
    setScanError(''); setNote('')
    if (!EXT[f.type]) return setScanError('Format belum didukung. Pakai foto JPG, PNG, atau berkas PDF.')
    const prepared = await prepare(f)
    if (prepared.blob.size > MAX_BYTES) return setScanError('Berkas terlalu besar. Maksimal 6 MB.')
    setFile(prepared)
    setPreview(prepared.mime === 'application/pdf' ? '' : URL.createObjectURL(prepared.blob))
    setScanning(true)
    try {
      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: { image_base64: await toBase64(prepared.blob), mime: prepared.mime, categories: categories.map((c) => c.name) },
      })
      if (error) {
        let detail = ''
        try { detail = (await (error as { context?: Response }).context?.json())?.error ?? '' } catch { /* tanpa rincian */ }
        throw new Error(detail || 'Pembacaan otomatis belum berhasil.')
      }
      setKind(data.type === 'income' ? 'income' : 'expense')
      setTitle(data.title ?? '')
      setAmount(String(data.amount ?? ''))
      setDate(data.date ?? today())
      setCategoryId(categories.find((c) => c.name === data.category)?.id ?? '')
      setNote(data.simulated
        ? 'Mode simulasi: ini contoh isian, bukan isi struk yang sebenarnya. Pasang kunci Gemini agar struk benar-benar dibaca.'
        : 'Hasil pembacaan otomatis. Periksa dulu sebelum menyimpan.')
    } catch (e) {
      setScanError(`${(e as Error).message} Isi manual saja, fotonya tetap tersimpan bersama transaksi.`)
    } finally {
      setScanning(false)
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const n = parseAmount(amount)
    if (n <= 0) return setFormError('Isi nominal lebih dari nol.')
    if (kind === 'expense' && !categoryId) return setFormError('Pilih kategori untuk pengeluaran ini.')
    setSaving(true); setFormError('')
    let receipt_path = editing?.receipt_path ?? null
    if (file) {
      const path = `${householdId}/${crypto.randomUUID()}.${EXT[file.mime] ?? 'jpg'}`
      const up = await supabase.storage.from('receipts').upload(path, file.blob, { contentType: file.mime })
      if (up.error) { setSaving(false); return setFormError('Foto struk belum terunggah. Coba lagi.') }
      if (receipt_path) await supabase.storage.from('receipts').remove([receipt_path])
      receipt_path = path
    }
    const row = {
      household_id: householdId, kind, amount: n, title: title.trim(), spent_on: date,
      person_id: personId || null, category_id: kind === 'expense' ? categoryId : null, receipt_path,
    }
    const { error } = editing
      ? await supabase.from('transactions').update(row).eq('id', editing.id)
      : await supabase.from('transactions').insert(row)
    setSaving(false)
    if (error) return setFormError('Transaksi belum tersimpan. Coba simpan lagi.')
    setError('')
    await reload()
    closeTx()
  }

  const form = (
    <form className="form" onSubmit={save}>
      <div className="seg" role="group" aria-label="Jenis transaksi">
        <button type="button" aria-pressed={kind === 'expense'} onClick={() => setKind('expense')}>Pengeluaran</button>
        <button type="button" aria-pressed={kind === 'income'} onClick={() => setKind('income')}>Pemasukan</button>
      </div>
      <label>Judul atau nama toko
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Belanja Bulanan" maxLength={80} />
      </label>
      <label>Nominal (Rp)
        <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" required />
        {parseAmount(amount) > 0 && <small className="muted">{formatRupiah(parseAmount(amount))}</small>}
      </label>
      <div className="two">
        <label>Tanggal
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label>Dicatat oleh
          <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      </div>
      {kind === 'expense' && (
        <label>Kategori
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="">Pilih kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      {formError && <p className="error" role="alert">{formError}</p>}
      <button className="primary" disabled={saving || scanning}>{saving ? 'Menyimpan…' : 'Simpan Transaksi'}</button>
    </form>
  )

  return (
    <Modal title={editing ? 'Ubah transaksi' : 'Tambah Transaksi'} onClose={closeTx} wide={mode === 'scan'}>
      {!editing && (
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'scan'} onClick={() => setMode('scan')}><Icon name="camera" size={18} /> Scan Struk / Bukti</button>
          <button role="tab" aria-selected={mode === 'manual'} onClick={() => setMode('manual')}><Icon name="edit" size={18} /> Input Manual</button>
        </div>
      )}
      {mode === 'manual' ? form : (
        <div className="scan">
          <div className="scan-left">
            {!file ? (
              <div className={`drop ${drag ? 'over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); void handleFile(e.dataTransfer.files[0]) }}>
                <Icon name="upload" size={34} />
                <p><strong>Tarik foto struk ke sini</strong><br />atau pilih salah satu:</p>
                <div className="drop-actions">
                  <button type="button" className="primary" onClick={() => camRef.current?.click()}><Icon name="camera" size={18} /> Ambil Foto</button>
                  <button type="button" onClick={() => fileRef.current?.click()}>Upload Struk &amp; Bukti Transfer</button>
                </div>
                <small className="muted">JPG, PNG, atau PDF. Maksimal 6 MB.</small>
              </div>
            ) : (
              <div className="preview">
                {preview ? <img src={preview} alt="Pratinjau struk" /> : <p className="muted">Berkas PDF terpilih.</p>}
                <button type="button" className="link" onClick={() => { setFile(null); setPreview(''); setNote(''); setScanError('') }}>Ganti foto</button>
              </div>
            )}
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = '' }} />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <div className="scan-right">
            {scanning && <p className="scanning" role="status"><span className="spinner" /> Membaca detail transaksi dari struk…</p>}
            {scanError && <p className="error" role="alert">{scanError}</p>}
            {note && <p className="note" role="status">{note}</p>}
            {file || scanError ? form : <p className="muted">Unggah foto dulu, isian akan terisi otomatis. Tidak punya struk? Pakai tab Input Manual.</p>}
          </div>
        </div>
      )}
    </Modal>
  )
}
