const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export const formatRupiah = (n: number) => rupiah.format(n)

/** Ringkas untuk sumbu grafik: 5.000.000 jadi "5 jt". */
export const formatJuta = (n: number) => (n === 0 ? '0' : `${Math.round((n / 1_000_000) * 10) / 10} jt`.replace('.', ','))

/** Ambil angka saja dari isian pengguna, misalnya "1.500.000" jadi 1500000. */
export const parseAmount = (s: string) => Number(s.replace(/\D/g, '')) || 0

const pad = (n: number) => String(n).padStart(2, '0')

export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const monthStart = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
export const shiftMonth = (d: Date, delta: number) => new Date(d.getFullYear(), d.getMonth() + delta, 1)
export const monthLabel = (d: Date) => d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
export const monthShort = (d: Date) => d.toLocaleDateString('id-ID', { month: 'short' })
export const today = () => isoDate(new Date())
export const parseIso = (iso: string) => new Date(iso + 'T00:00:00')
export const shortDate = (iso: string) => parseIso(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
export const inMonth = (iso: string, d: Date) => iso.slice(0, 7) === monthStart(d).slice(0, 7)

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Status anggaran: aman di bawah 75%, waspada 75 sampai 99%, melebihi mulai 100%. */
export function budgetLevel(used: number, limit: number): 'none' | 'safe' | 'warn' | 'over' {
  if (limit <= 0) return used > 0 ? 'over' : 'none'
  const r = used / limit
  return r >= 1 ? 'over' : r >= 0.75 ? 'warn' : 'safe'
}

export const levelLabel = { none: 'Belum diatur', safe: 'Aman', warn: 'Waspada', over: 'Melebihi anggaran' } as const
