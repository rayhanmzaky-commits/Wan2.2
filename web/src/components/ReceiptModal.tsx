import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useData } from '../lib/data'
import { Modal } from './ui'

export default function ReceiptModal() {
  const { receiptPath, viewReceipt } = useData()
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!receiptPath) return
    supabase.storage.from('receipts').createSignedUrl(receiptPath, 300).then(({ data, error }) => {
      if (error || !data) setFailed(true)
      else setUrl(data.signedUrl)
    })
  }, [receiptPath])

  const isPdf = receiptPath?.toLowerCase().endsWith('.pdf')
  return (
    <Modal title="Bukti transaksi" onClose={() => viewReceipt(null)}>
      {failed && <p className="error">Foto bukti belum bisa dibuka. Coba lagi sebentar lagi.</p>}
      {!failed && !url && <p className="muted">Membuka foto…</p>}
      {url && (isPdf
        ? <p><a className="cta-link" href={url} target="_blank" rel="noreferrer">Buka berkas PDF di tab baru</a></p>
        : <img className="receipt-img" src={url} alt="Foto struk atau bukti transfer" />)}
    </Modal>
  )
}
