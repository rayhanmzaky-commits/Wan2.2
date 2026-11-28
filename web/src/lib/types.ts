export type Person = { id: string; name: string; role: string; color: string; sort: number }
export type Category = { id: string; name: string }
export type Budget = { category_id: string; month: string; amount: number }
export type Tx = {
  id: string
  category_id: string | null
  kind: 'expense' | 'income'
  amount: number
  title: string
  spent_on: string
  person_id: string | null
  receipt_path: string | null
  bill_id: string | null
}
export type Goal = { id: string; name: string; target: number; saved: number; deadline: string | null }
export type Bill = {
  id: string
  name: string
  amount: number
  due_day: number
  paid_month: string | null
  category_id: string | null
}
