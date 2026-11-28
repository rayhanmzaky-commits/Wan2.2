import { useData } from '../lib/data'
import { Icon } from '../lib/icons'
import { Bar, Empty } from '../components/ui'
import { TxRow } from '../components/TxRow'
import { budgetLevel, formatRupiah, inMonth, levelLabel, monthLabel, monthStart } from '../lib/format'

export default function Dashboard() {
  const { balance, txs, categories, budgets, openTx } = useData()
  const now = new Date()
  const key = monthStart(now)
  const month = txs.filter((t) => inMonth(t.spent_on, now))
  const income = month.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = month.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount, 0)
  const limitOf = (id: string) => budgets.find((b) => b.category_id === id && b.month === key)?.amount ?? 0
  const usedOf = (id: string) => month.filter((t) => t.kind === 'expense' && t.category_id === id).reduce((s, t) => s + t.amount, 0)

  return (
    <>
      <section className="cards" aria-label="Ringkasan keuangan">
        <article className="card sum green">
          <span className="sum-icon"><Icon name="wallet" size={26} /></span>
          <p>Total Saldo Keluarga</p>
          <strong>{formatRupiah(balance)}</strong>
        </article>
        <article className="card sum blue">
          <span className="sum-icon"><Icon name="up" size={26} /></span>
          <p>Pemasukan Bulan Ini</p>
          <strong>{formatRupiah(income)}</strong>
        </article>
        <article className="card sum orange">
          <span className="sum-icon"><Icon name="down" size={26} /></span>
          <p>Pengeluaran Bulan Ini</p>
          <strong>{formatRupiah(expense)}</strong>
        </article>
      </section>

      <section className="card" aria-labelledby="pva">
        <div className="card-head">
          <h2 id="pva">Pengeluaran vs Anggaran</h2>
          <span className="muted">{monthLabel(now)}</span>
        </div>
        {categories.length === 0 ? <Empty>Belum ada pos anggaran. Tambahkan di menu Pos Anggaran.</Empty> : (
          <ul className="budget-list">
            {categories.map((c) => {
              const used = usedOf(c.id)
              const limit = limitOf(c.id)
              const level = budgetLevel(used, limit)
              return (
                <li key={c.id}>
                  <div className="budget-top">
                    <strong>{c.name}</strong>
                    <span className="budget-nums">
                      {limit > 0 ? `${formatRupiah(used)} / ${formatRupiah(limit)}` : `${formatRupiah(used)} / belum diatur`}
                    </span>
                  </div>
                  <Bar used={used} limit={limit} label={c.name} />
                  <small className={`status lvl-${level}`}>{levelLabel[level]}</small>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="recent">
        <div className="card-head">
          <h2 id="recent">Aktivitas Terbaru</h2>
          <a className="link" href="#/transaksi">Lihat semua</a>
        </div>
        {txs.length === 0 ? (
          <Empty>Belum ada transaksi. <button className="link" onClick={() => openTx()}>Catat yang pertama</button>.</Empty>
        ) : (
          <ul className="tx-list">{txs.slice(0, 8).map((t) => <TxRow key={t.id} tx={t} />)}</ul>
        )}
      </section>
    </>
  )
}
