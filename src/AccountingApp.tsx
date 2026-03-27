import { useState, type FormEvent } from 'react'
import { useAccountingStore } from './store/accountingStore'
import type { CostKind } from './types'
import { supabase } from './supabaseClient'

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export default function AccountingApp() {
  const {
    state,
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
    loading,
    isBusy,
    error,
    getTodayISO,
  } = useAccountingStore()

  const [logoutBusy, setLogoutBusy] = useState(false)

  const [saleDate, setSaleDate] = useState(() => getTodayISO())
  const [saleDescription, setSaleDescription] = useState('')
  const [saleAmount, setSaleAmount] = useState('')
  const [saleError, setSaleError] = useState<string | null>(null)

  const [costDate, setCostDate] = useState(() => getTodayISO())
  const [costKind, setCostKind] = useState<CostKind>('Expense')
  const [costDescription, setCostDescription] = useState('')
  const [costAmount, setCostAmount] = useState('')
  const [costError, setCostError] = useState<string | null>(null)

  const profitTone = netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
  const profitBg = netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'
  const profitBorder = netProfit >= 0 ? 'border-emerald-200' : 'border-rose-200'

  const canReset = state.sales.length > 0 || state.costs.length > 0

  const onAddSale = (e: FormEvent) => {
    e.preventDefault()
    setSaleError(null)

    const description = saleDescription.trim()
    const amount = Number(saleAmount)

    if (!saleDate) return setSaleError('Please choose a date.')
    if (!description) return setSaleError('Please enter a description.')
    if (!Number.isFinite(amount) || amount <= 0) return setSaleError('Amount must be a positive number.')

    void addSale({ date: saleDate, description, amount })
    setSaleDescription('')
    setSaleAmount('')
    setSaleDate(getTodayISO())
  }

  const onAddCost = (e: FormEvent) => {
    e.preventDefault()
    setCostError(null)

    const description = costDescription.trim()
    const amount = Number(costAmount)

    if (!costDate) return setCostError('Please choose a date.')
    if (!description) return setCostError('Please enter a description.')
    if (!Number.isFinite(amount) || amount <= 0) return setCostError('Amount must be a positive number.')

    void addCost({ date: costDate, description, amount, kind: costKind })
    setCostDescription('')
    setCostAmount('')
    setCostDate(getTodayISO())
  }

  const onReset = () => {
    if (!canReset) return
    const ok = window.confirm('Reset all saved data in Supabase (for this workshop tables)?')
    if (!ok) return
    void reset()
    setSaleDescription('')
    setSaleAmount('')
    setSaleDate(getTodayISO())
    setCostDescription('')
    setCostAmount('')
    setCostDate(getTodayISO())
  }

  const onLogout = async () => {
    if (logoutBusy) return
    setLogoutBusy(true)
    try {
      await supabase.auth.signOut()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Logout failed.')
    } finally {
      setLogoutBusy(false)
    }
  }

  return (
    <div className="min-h-[100svh] bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Accounting App (Embroidery Workshop)</h1>
            <p className="mt-1 text-sm text-slate-600">
              Data is persisted to Supabase (cloud). Your computed profit shares are based on the latest data.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              disabled={!canReset || isBusy}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset Data
            </button>

            <button
              type="button"
              onClick={() => void onLogout()}
              disabled={isBusy || logoutBusy}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Logout
            </button>
          </div>
        </header>

        {loading ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
            Loading data from Supabase...
          </div>
        ) : null}
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Total Sales</p>
            <p className="mt-1 text-3xl font-semibold">{formatAmount(totalSales)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-600">Total Expenses & Purchases</p>
            <p className="mt-1 text-3xl font-semibold">{formatAmount(totalCosts)}</p>
          </div>

          <div className={`rounded-xl border ${profitBorder} ${profitBg} p-4 shadow-sm`}>
            <p className="text-sm text-slate-600">Net Profit</p>
            <p className={`mt-1 text-3xl font-semibold ${profitTone}`}>{formatAmount(netProfit)}</p>
          </div>
        </section>

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Profit Distribution</h2>
              <p className="mt-1 text-sm text-slate-600">
                Your share is <span className="font-medium">25%</span> and your partner share is{' '}
                <span className="font-medium">75%</span> of net profit.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">Your Share (25%)</p>
              <p className="mt-1 text-2xl font-semibold">{formatAmount(yourShare)}</p>
              <p className="mt-1 text-xs text-slate-600">= Net Profit × 0.25</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">Partner Share (75%)</p>
              <p className="mt-1 text-2xl font-semibold">{formatAmount(partnerShare)}</p>
              <p className="mt-1 text-xs text-slate-600">= Net Profit × 0.75</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Add Sales</h2>
            <p className="mt-1 text-sm text-slate-600">Record each sales entry.</p>

            <form onSubmit={onAddSale} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Date</span>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Amount</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={saleAmount}
                    onChange={(e) => setSaleAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <input
                  type="text"
                  value={saleDescription}
                  onChange={(e) => setSaleDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  placeholder="e.g., Embroidery set - customer payment"
                />
              </label>

              {saleError ? <p className="text-sm text-rose-600">{saleError}</p> : null}

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                disabled={isBusy}
              >
                Add Sale
              </button>
            </form>

            <div className="mt-5 min-h-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-800">Sales List</h3>
              <div className="mt-3 max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                {state.sales.length === 0 ? (
                  <p className="text-sm text-slate-600">No sales added yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {state.sales.map((s) => (
                      <li key={s.id} className="flex items-start justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{s.description}</p>
                          <p className="text-xs text-slate-600">{s.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{formatAmount(s.amount)}</span>
                          <button
                            type="button"
                            onClick={() => void deleteSale(s.id)}
                            className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            aria-label="Delete sale"
                            disabled={isBusy}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Add Expenses & Purchases</h2>
            <p className="mt-1 text-sm text-slate-600">Record costs (materials, transport, etc.).</p>

            <form onSubmit={onAddCost} className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block sm:col-span-1">
                  <span className="text-sm font-medium text-slate-700">Date</span>
                  <input
                    type="date"
                    value={costDate}
                    onChange={(e) => setCostDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="block sm:col-span-1">
                  <span className="text-sm font-medium text-slate-700">Type</span>
                  <select
                    value={costKind}
                    onChange={(e) => setCostKind(e.target.value as CostKind)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="Expense">Expense</option>
                    <option value="Purchase">Purchase</option>
                  </select>
                </label>

                <label className="block sm:col-span-1">
                  <span className="text-sm font-medium text-slate-700">Amount</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={costAmount}
                    onChange={(e) => setCostAmount(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    placeholder="0.00"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <input
                  type="text"
                  value={costDescription}
                  onChange={(e) => setCostDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  placeholder="e.g., Thread + needles, transport, rent..."
                />
              </label>

              {costError ? <p className="text-sm text-rose-600">{costError}</p> : null}

              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                disabled={isBusy}
              >
                Add {costKind}
              </button>
            </form>

            <div className="mt-5 min-h-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-800">Costs List</h3>
              <div className="mt-3 max-h-[400px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                {state.costs.length === 0 ? (
                  <p className="text-sm text-slate-600">No expenses/purchases added yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-200">
                    {state.costs.map((c) => (
                      <li key={c.id} className="flex items-start justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{c.description}</p>
                          <p className="text-xs text-slate-600">
                            {c.date} · <span className="font-medium">{c.kind}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{formatAmount(c.amount)}</span>
                          <button
                            type="button"
                            onClick={() => void deleteCost(c.id)}
                            className="rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            aria-label="Delete cost"
                            disabled={isBusy}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-8 text-center text-xs text-slate-500">
          Tip: your changes persist in Supabase. Use Reset to clear all rows.
        </footer>
      </div>
    </div>
  )
}

