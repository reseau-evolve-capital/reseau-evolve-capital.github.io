'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@evolve/ui'
import { useSupabase } from '@/components/providers/SupabaseProvider'

interface Props {
  tokenHash: string | null
}

export function VerifyClient({ tokenHash }: Props) {
  const router = useRouter()
  const supabase = useSupabase()
  const [error, setError] = useState(() => !tokenHash)

  useEffect(() => {
    if (!tokenHash) return

    let cancelled = false
    ;(async () => {
      const { error: verr } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      })
      if (cancelled) return
      if (verr) {
        setError(true)
        return
      }

      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id ?? ''
      const { data: profile } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', uid)
        .maybeSingle()

      if (cancelled) return
      router.replace(profile?.onboarding_completed ? '/dashboard' : '/onboarding/step-1')
    })()

    return () => {
      cancelled = true
    }
  }, [tokenHash, supabase, router])

  if (error) {
    return (
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-card">
        <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.01em] text-text">
          Ce lien a expiré ou est invalide.
        </h1>
        <p className="mt-3 font-body text-[14px] leading-relaxed text-text-sec">
          Demande-en un nouveau pour te connecter.
        </p>
        <div className="mt-6">
          <Button variant="primary" onClick={() => router.push('/login')}>
            Retour au login
          </Button>
        </div>
      </section>
    )
  }

  return (
    <p className="font-body text-[14px] text-text-sec" role="status">
      Connexion en cours…
    </p>
  )
}
