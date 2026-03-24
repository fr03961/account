import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import AccountingApp from './AccountingApp'
import LoginPage from './LoginPage'

export default function AuthApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [accessChecking, setAccessChecking] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setAuthLoading(false)
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const allowedEmail = import.meta.env.VITE_ALLOWED_EMAIL as string | undefined
    if (!session || !allowedEmail) return

    const check = async () => {
      setAccessChecking(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        const userEmail = user?.email?.toLowerCase()
        const wantedEmail = allowedEmail.toLowerCase()
        if (!userEmail || userEmail !== wantedEmail) {
          await supabase.auth.signOut()
        }
      } finally {
        setAccessChecking(false)
      }
    }

    void check()
  }, [session])

  if (authLoading) {
    return (
      <div className="min-h-[100svh] bg-slate-50">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-slate-600">
          <div className="text-lg font-medium">Loading...</div>
          <div className="text-sm">Checking your login session.</div>
        </div>
      </div>
    )
  }

  if (accessChecking) {
    return (
      <div className="min-h-[100svh] bg-slate-50">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-slate-600">
          <div className="text-lg font-medium">Please wait...</div>
          <div className="text-sm">Verifying your access.</div>
        </div>
      </div>
    )
  }

  if (!session) return <LoginPage />
  return <AccountingApp />
}

