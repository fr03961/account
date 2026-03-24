import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { AccountingState, Cost, CostKind, Sale } from '../types'

type SaleRow = {
  id: string
  date: string
  description: string
  amount: number | string
}

type ExpenseRow = {
  id: string
  date: string
  description: string
  amount: number | string
  kind: CostKind | string
}

function getTodayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseAmount(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function parseISODate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  // Expected format from `<input type="date" />`: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return value
}

function mapSaleRow(row: SaleRow): Sale | null {
  const id = typeof row.id === 'string' ? row.id : ''
  const date = parseISODate(row.date)
  const description = typeof row.description === 'string' ? row.description : ''
  const amount = parseAmount(row.amount)
  if (!id || !date || !description || amount === null) return null
  return { id, date, description, amount }
}

function mapExpenseRow(row: ExpenseRow): Cost | null {
  const id = typeof row.id === 'string' ? row.id : ''
  const date = parseISODate(row.date)
  const description = typeof row.description === 'string' ? row.description : ''
  const amount = parseAmount(row.amount)
  const kind = row.kind === 'Purchase' || row.kind === 'Expense' ? (row.kind as CostKind) : null
  if (!id || !date || !description || amount === null || !kind) return null
  return { id, date, description, amount, kind }
}

export function useAccountingStore() {
  const [state, setState] = useState<AccountingState>({ sales: [], costs: [] })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const isBusy = loading || busy

  const fetchAll = async (uid: string) => {
    setLoading(true)
    setError(null)

    const [salesRes, expensesRes] = await Promise.all([
      supabase
        .from('sales')
        .select('id,date,description,amount')
        .eq('user_id', uid)
        .order('date', { ascending: false }),
      supabase
        .from('expenses')
        .select('id,date,description,amount,kind')
        .eq('user_id', uid)
        .order('date', { ascending: false }),
    ])

    if (salesRes.error) {
      setError(`Failed to load sales: ${salesRes.error.message}`)
      setState({ sales: [], costs: [] })
      setLoading(false)
      return
    }
    if (expensesRes.error) {
      setError(`Failed to load expenses: ${expensesRes.error.message}`)
      setState({ sales: [], costs: [] })
      setLoading(false)
      return
    }

    const salesRows = (salesRes.data ?? []) as unknown as SaleRow[]
    const expenseRows = (expensesRes.data ?? []) as unknown as ExpenseRow[]

    const sales = salesRows.map(mapSaleRow).filter((s): s is Sale => s !== null)
    const costs = expenseRows.map(mapExpenseRow).filter((c): c is Cost => c !== null)

    setState({ sales, costs })
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      setError(null)

      const { data, error: authError } = await supabase.auth.getUser()
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }
      if (!data.user) {
        setError('You must be logged in to view accounting data.')
        setLoading(false)
        return
      }

      setUserId(data.user.id)
      await fetchAll(data.user.id)
    }

    void init()
  }, [])

  const totalSales = useMemo(
    () => state.sales.reduce((sum, s) => sum + (Number.isFinite(s.amount) ? s.amount : 0), 0),
    [state.sales],
  )
  const totalCosts = useMemo(
    () => state.costs.reduce((sum, c) => sum + (Number.isFinite(c.amount) ? c.amount : 0), 0),
    [state.costs],
  )
  const netProfit = useMemo(() => totalSales - totalCosts, [totalSales, totalCosts])

  const yourShare = useMemo(() => netProfit * 0.25, [netProfit])
  const partnerShare = useMemo(() => netProfit * 0.75, [netProfit])

  const addSale = async (input: Omit<Sale, 'id'>) => {
    setBusy(true)
    setError(null)
    try {
      if (!userId) throw new Error('Not authenticated.')

      const amount = parseAmount(input.amount)
      if (amount === null) throw new Error('Invalid amount')

      const { data, error: insertError } = await supabase
        .from('sales')
        .insert({ user_id: userId, date: input.date, description: input.description, amount })
        .select('id,date,description,amount')
        .single()

      if (insertError) throw insertError
      if (!data) throw new Error('No data returned after inserting sale.')

      const sale = mapSaleRow(data as SaleRow)
      if (!sale) throw new Error('Inserted sale has invalid shape.')

      setState((prev) => ({ ...prev, sales: [sale, ...prev.sales] }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add sale.')
    } finally {
      setBusy(false)
    }
  }

  const addCost = async (input: Omit<Cost, 'id'>) => {
    setBusy(true)
    setError(null)
    try {
      if (!userId) throw new Error('Not authenticated.')

      const amount = parseAmount(input.amount)
      if (amount === null) throw new Error('Invalid amount')

      const { data, error: insertError } = await supabase
        .from('expenses')
        .insert({
          user_id: userId,
          date: input.date,
          description: input.description,
          amount,
          kind: input.kind,
        })
        .select('id,date,description,amount,kind')
        .single()

      if (insertError) throw insertError
      if (!data) throw new Error('No data returned after inserting expense.')

      const cost = mapExpenseRow(data as ExpenseRow)
      if (!cost) throw new Error('Inserted expense has invalid shape.')

      setState((prev) => ({ ...prev, costs: [cost, ...prev.costs] }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add expense/purchase.')
    } finally {
      setBusy(false)
    }
  }

  const deleteSale = async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      if (!userId) throw new Error('Not authenticated.')

      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .eq('user_id', userId)
        .eq('id', id)
      if (deleteError) throw deleteError

      setState((prev) => ({ ...prev, sales: prev.sales.filter((s) => s.id !== id) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete sale.')
    } finally {
      setBusy(false)
    }
  }

  const deleteCost = async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      if (!userId) throw new Error('Not authenticated.')

      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', userId)
        .eq('id', id)
      if (deleteError) throw deleteError

      setState((prev) => ({ ...prev, costs: prev.costs.filter((c) => c.id !== id) }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete expense/purchase.')
    } finally {
      setBusy(false)
    }
  }

  const reset = async () => {
    setBusy(true)
    setError(null)
    try {
      if (!userId) throw new Error('Not authenticated.')

      await Promise.all([
        supabase.from('sales').delete().eq('user_id', userId),
        supabase.from('expenses').delete().eq('user_id', userId),
      ])

      setState({ sales: [], costs: [] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reset data.')
    } finally {
      setBusy(false)
    }
  }

  return {
    state,
    loading,
    busy,
    isBusy,
    error,
    totalSales,
    totalCosts,
    netProfit,
    yourShare,
    partnerShare,
    addSale,
    addCost,
    deleteSale,
    deleteCost,
    reset,
    getTodayISO,
  }
}

