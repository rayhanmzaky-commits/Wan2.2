import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { monthStart, shiftMonth } from './format'
import type { Bill, Budget, Category, Goal, Person, Tx } from './types'

type Ctx = {
  householdId: string
  householdName: string
  inviteCode: string
  email: string
  people: Person[]
  categories: Category[]
  budgets: Budget[]
  txs: Tx[]
  goals: Goal[]
  bills: Bill[]
  balance: number
  loading: boolean
  error: string
  setError: (m: string) => void
  reload: () => Promise<void>
  active: Person | undefined
  setActiveId: (id: string) => void
  txEditor: { tx: Tx | null } | null
  openTx: (tx?: Tx | null) => void
  closeTx: () => void
  receiptPath: string | null
  viewReceipt: (path: string | null) => void
  signOut: () => void
  personOf: (id: string | null) => Person | undefined
  categoryOf: (id: string | null) => Category | undefined
}

const DataCtx = createContext<Ctx | null>(null)

export function useData(): Ctx {
  const c = useContext(DataCtx)
  if (!c) throw new Error('useData harus dipakai di dalam DataProvider')
  return c
}

const num = (n: unknown) => Number(n) || 0

export function DataProvider({ householdId, email, onSignOut, children }: {
  householdId: string; email: string; onSignOut: () => void; children: ReactNode
}) {
  const [householdName, setHouseholdName] = useState('Keluarga')
  const [inviteCode, setInviteCode] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [txs, setTxs] = useState<Tx[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeId, setActiveIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(`aktif:${householdId}`) } catch { return null }
  })
  const [txEditor, setTxEditor] = useState<{ tx: Tx | null } | null>(null)
  const [receiptPath, setReceiptPath] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const since = monthStart(shiftMonth(new Date(), -12))
    const [h, p, c, b, t, g, bl, bal] = await Promise.all([
      supabase.from('households').select('name,invite_code').eq('id', householdId).single(),
      supabase.from('people').select('id,name,role,color,sort').eq('household_id', householdId).order('sort').order('created_at'),
      supabase.from('categories').select('id,name').eq('household_id', householdId).order('name'),
      supabase.from('budgets').select('category_id,month,amount').eq('household_id', householdId),
      supabase.from('transactions')
        .select('id,category_id,kind,amount,title,spent_on,person_id,receipt_path,bill_id')
        .eq('household_id', householdId).gte('spent_on', since)
        .order('spent_on', { ascending: false }).order('created_at', { ascending: false }).limit(3000),
      supabase.from('savings_goals').select('id,name,target,saved,deadline').eq('household_id', householdId).order('created_at'),
      supabase.from('bills').select('id,name,amount,due_day,paid_month,category_id').eq('household_id', householdId).order('due_day'),
      supabase.rpc('household_balance', { p_household: householdId }),
    ])
    const failed = [h, p, c, b, t, g, bl, bal].find((r) => r.error)
    if (failed) {
      setError('Data belum bisa dimuat. Periksa koneksi internet, lalu muat ulang halaman.')
      setLoading(false)
      return
    }
    setError('')
    setHouseholdName(h.data?.name ?? 'Keluarga')
    setInviteCode(h.data?.invite_code ?? '')
    setPeople((p.data ?? []) as Person[])
    setCategories((c.data ?? []) as Category[])
    setBudgets((b.data ?? []).map((r) => ({ ...r, amount: num(r.amount) })) as Budget[])
    setTxs((t.data ?? []).map((r) => ({ ...r, amount: num(r.amount) })) as Tx[])
    setGoals((g.data ?? []).map((r) => ({ ...r, target: num(r.target), saved: num(r.saved) })) as Goal[])
    setBills((bl.data ?? []).map((r) => ({ ...r, amount: num(r.amount) })) as Bill[])
    setBalance(num(bal.data))
    setLoading(false)
  }, [householdId])

  useEffect(() => { void reload() }, [reload])

  const active = useMemo(() => people.find((p) => p.id === activeId) ?? people[0], [people, activeId])

  const value: Ctx = {
    householdId, householdName, inviteCode, email, people, categories, budgets, txs, goals, bills, balance,
    loading, error, setError, reload, active,
    setActiveId: (id) => {
      setActiveIdState(id)
      try { localStorage.setItem(`aktif:${householdId}`, id) } catch { /* penyimpanan tidak tersedia */ }
    },
    txEditor,
    openTx: (tx = null) => setTxEditor({ tx }),
    closeTx: () => setTxEditor(null),
    receiptPath,
    viewReceipt: setReceiptPath,
    signOut: onSignOut,
    personOf: (id) => people.find((p) => p.id === id),
    categoryOf: (id) => categories.find((c) => c.id === id),
  }

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}
