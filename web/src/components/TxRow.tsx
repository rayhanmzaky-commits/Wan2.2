import { supabase } from '../lib/supabase'
import { useData } from '../lib/data'
import { formatRupiah, shortDate } from '../lib/format'
import { Icon } from '../lib/icons'
import { Avatar } from './ui'
import type { Tx } from '../lib/types'

export function TxRow({ tx, actions }: { tx: Tx; actions?: boolean }) {
  const { personOf, categoryOf, viewReceipt, openTx, reload, setError } = useData()
  const person = personOf(tx.person_id)
  const cat = categoryOf(tx.category_id)
  const income = tx.kind === 'income'

  async function remove() {
    if (!window.confirm(`Hapus transaksi "${tx.title || 'tanpa judul'}" sebesar ${formatRupiah(tx.amount)}?`)) return
    const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
    if (error) return setError('Transaksi belum terhapus. Coba lagi.')
    if (tx.receipt_path) await supabase.storage.from('receipts').remove([tx.receipt_path])
    void reload()
  }

  return (
    <li className="tx">
      <span className="tx-who"><Avatar person={person} size={34} /><span className="tx-name">{person?.name ?? 'Tanpa nama'}</span></span>
      <span className="tx-what">
        <strong>{tx.title || (income ? 'Pemasukan' : 'Pengeluaran')}</strong>
        <small>{income ? 'Pemasukan' : cat?.name ?? 'Tanpa kategori'}</small>
      </span>
      <span className="tx-date">{shortDate(tx.spent_on)}</span>
      <span className="tx-receipt">
        {tx.receipt_path && (
          <button className="icon-btn" aria-label={`Lihat struk ${tx.title}`} onClick={() => viewReceipt(tx.receipt_path)}>
            <Icon name="clip" size={18} />
          </button>
        )}
      </span>
      <span className={`tx-amount ${income ? 'in' : 'out'}`}>{income ? '+' : '−'}{formatRupiah(tx.amount)}</span>
      {actions && (
        <span className="tx-actions">
          <button className="icon-btn" aria-label={`Ubah ${tx.title}`} onClick={() => openTx(tx)}><Icon name="edit" size={18} /></button>
          <button className="icon-btn danger" aria-label={`Hapus ${tx.title}`} onClick={remove}><Icon name="trash" size={18} /></button>
        </span>
      )}
    </li>
  )
}
