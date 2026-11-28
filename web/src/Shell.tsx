import { useEffect, useState } from 'react'
import { useData } from './lib/data'
import { Icon } from './lib/icons'
import { Avatar, Modal } from './components/ui'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Bills from './pages/Bills'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import TxModal from './TxModal'
import ReceiptModal from './components/ReceiptModal'

const NAV = [
  { id: 'dashboard', label: 'Dashboard Utama', short: 'Beranda', icon: 'home' },
  { id: 'transaksi', label: 'Catatan Transaksi', short: 'Transaksi', icon: 'list' },
  { id: 'anggaran', label: 'Pos Anggaran', short: 'Anggaran', icon: 'budget' },
  { id: 'tabungan', label: 'Target Tabungan', short: 'Tabungan', icon: 'target' },
  { id: 'tagihan', label: 'Tagihan Bulanan', short: 'Tagihan', icon: 'bill' },
  { id: 'laporan', label: 'Laporan', short: 'Laporan', icon: 'chart' },
  { id: 'pengaturan', label: 'Pengaturan', short: 'Pengaturan', icon: 'settings' },
] as const
type PageId = (typeof NAV)[number]['id']

const readHash = (): PageId => {
  const h = window.location.hash.replace('#/', '')
  return NAV.some((n) => n.id === h) ? (h as PageId) : 'dashboard'
}

const PAGES: Record<PageId, () => JSX.Element> = {
  dashboard: Dashboard, transaksi: Transactions, anggaran: Budgets, tabungan: Goals,
  tagihan: Bills, laporan: Reports, pengaturan: Settings,
}

export default function Shell() {
  const { householdName, people, active, setActiveId, openTx, txEditor, receiptPath, loading, error, setError } = useData()
  const [page, setPage] = useState<PageId>(readHash)
  const [more, setMore] = useState(false)

  useEffect(() => {
    const on = () => { setPage(readHash()); setMore(false); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const go = (id: PageId) => { window.location.hash = `#/${id}` }
  const Page = PAGES[page]
  const bottom = NAV.slice(0, 4)
  const inMore = !bottom.some((n) => n.id === page)

  return (
    <div className="app">
      <aside className="side" aria-label="Menu utama">
        <div className="brand">
          <span className="logo" aria-hidden="true"><Icon name="wallet" size={22} /></span>
          <span><strong>{householdName}</strong><small>Keuangan Keluarga</small></span>
        </div>
        <nav>
          {NAV.map((n) => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'on' : ''}`} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              <Icon name={n.icon} /> {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="head">
          <div className="titles">
            <h1>{householdName}</h1>
            <p>Pusat Pengelolaan Keuangan &amp; Tabungan Keluarga</p>
          </div>
          <div className="head-actions">
            <div className="switcher" role="radiogroup" aria-label="Siapa yang sedang mencatat">
              {people.map((p) => (
                <button key={p.id} role="radio" aria-checked={active?.id === p.id} className={`who ${active?.id === p.id ? 'on' : ''}`}
                  onClick={() => setActiveId(p.id)} title={`Mencatat sebagai ${p.name}`}>
                  <Avatar person={p} size={38} />
                  <small>{p.name}</small>
                </button>
              ))}
            </div>
            <button className="cta" onClick={() => openTx()}>
              <Icon name="plus" size={18} /><span>Catat Transaksi / Scan Struk</span>
            </button>
          </div>
        </header>

        {error && <p className="banner error" role="alert">{error} <button className="link" onClick={() => setError('')}>Tutup</button></p>}
        <main className="content">{loading ? <p className="muted">Memuat data keluarga…</p> : <Page />}</main>
      </div>

      <nav className="bottom" aria-label="Menu utama">
        {bottom.map((n) => (
          <button key={n.id} className={page === n.id ? 'on' : ''} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
            <Icon name={n.icon} /><span>{n.short}</span>
          </button>
        ))}
        <button className={inMore ? 'on' : ''} onClick={() => setMore(true)}><Icon name="more" /><span>Lainnya</span></button>
      </nav>

      {more && (
        <Modal title="Menu lainnya" onClose={() => setMore(false)}>
          <div className="more-list">
            {NAV.slice(4).map((n) => (
              <button key={n.id} className="nav-item" onClick={() => go(n.id)}><Icon name={n.icon} /> {n.label}</button>
            ))}
          </div>
        </Modal>
      )}
      {txEditor && <TxModal />}
      {receiptPath && <ReceiptModal />}
    </div>
  )
}
