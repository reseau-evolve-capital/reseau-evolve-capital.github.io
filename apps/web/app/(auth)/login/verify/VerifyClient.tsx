'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@evolve/ui'
import { useSupabase } from '@/components/providers/SupabaseProvider'

interface Props {
  tokenHash: string | null
  /** Type d'OTP à vérifier : 'email' (magic-link signInWithOtp) ou 'magiclink' (lien d'invitation). */
  otpType?: string | null
  /** Première connexion via une invitation → propage ?invited à l'onboarding (accueil dédié). */
  invited?: boolean
}

// Le flux invitation (ADM-007) génère un lien via admin.generateLink({ type: 'magiclink' }) →
// son hashed_token se vérifie avec type 'magiclink'. Le flux nominal (signInWithOtp) utilise 'email'.
function resolveOtpType(t: string | null | undefined): 'email' | 'magiclink' {
  return t === 'magiclink' ? 'magiclink' : 'email'
}

export function VerifyClient({ tokenHash, otpType, invited = false }: Props) {
  const t = useTranslations('login.verify')
  const router = useRouter()
  const supabase = useSupabase()
  const [error, setError] = useState(() => !tokenHash)

  useEffect(() => {
    if (!tokenHash) return

    let cancelled = false
    ;(async () => {
      const { error: verr } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: resolveOtpType(otpType),
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
      if (profile?.onboarding_completed) {
        router.replace('/dashboard')
      } else {
        router.replace(invited ? '/onboarding/step-1?invited=1' : '/onboarding/step-1')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [tokenHash, otpType, invited, supabase, router])

  if (error) {
    return (
      <section className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-card">
        <h1 className="font-display text-[24px] font-bold leading-tight tracking-[-0.01em] text-text">
          {t('expiredTitle')}
        </h1>
        <p className="mt-3 font-body text-[14px] leading-relaxed text-text-sec">
          {t('expiredBody')}
        </p>
        <div className="mt-6">
          <Button variant="primary" onClick={() => router.push('/login')}>
            {t('backToLogin')}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <p className="font-body text-[14px] text-text-sec" role="status">
      {t('connecting')}
    </p>
  )
}
