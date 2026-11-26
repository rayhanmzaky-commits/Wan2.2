import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase } from './lib/supabase'
import Login from './Login'
import Setup from './Setup'
import Dashboard from './Dashboard'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [loadingHousehold, setLoadingHousehold] = useState(false)

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) {
      setHouseholdId(null)
      return
    }
    setLoadingHousehold(true)
    supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .limit(1)
      .then(({ data }) => {
        setHouseholdId(data?.[0]?.household_id ?? null)
        setLoadingHousehold(false)
      })
  }, [userId])

  if (!configured) {
    return (
      <main className="center">
        <div className="panel">
          <h1>Hubungkan Supabase dulu</h1>
          <p>
            Salin <code>.env.example</code> menjadi <code>.env</code>, lalu isi{' '}
            <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> dari project
            Supabase kamu. Jalankan juga <code>supabase/schema.sql</code> di SQL editor.
          </p>
        </div>
      </main>
    )
  }

  if (!ready || loadingHousehold) return <main className="center">Memuat…</main>
  if (!session) return <Login />
  if (!householdId) return <Setup onReady={setHouseholdId} />
  return (
    <Dashboard
      householdId={householdId}
      email={session.user.email ?? ''}
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}
