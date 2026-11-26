const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export const formatRupiah = (n: number) => rupiah.format(n)

/** Ambil angka saja dari isian pengguna, misalnya "1.500.000" jadi 1500000. */
export const parseAmount = (s: string) => Number(s.replace(/\D/g, '')) || 0

const pad = (n: number) => String(n).padStart(2, '0')

export const monthStart = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`

export const shiftMonth = (d: Date, delta: number) =>
  new Date(d.getFullYear(), d.getMonth() + delta, 1)

export const monthLabel = (d: Date) =>
  d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const shortDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
