'use client'
// Connexion par code OTP 6 chiffres — affiché PAR DÉFAUT sur /login/check-email
// (fix PWA juin) : sur iOS le magic link s'ouvre toujours dans Safari, jamais dans
// la PWA installée. L'utilisateur choisit donc : cliquer le lien OU saisir ici le
// code reçu dans le même email. La vérification passe par
// supabase.auth.verifyOtp({ email, token, type: 'email' }) — valide même quand
// signInWithOtp a été initié en PKCE côté serveur (POST /verify renvoie la session
// directement). Logique pure extraite dans @/lib/auth/otp (testée en Vitest).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { Button, FormField, Input } from '@evolve/ui'

import { useSupabase } from '@/components/providers/SupabaseProvider'
import { isCompleteOtpCode, sanitizeOtpCode, verifyEmailOtp, OTP_CODE_LENGTH } from '@/lib/auth/otp'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function OtpForm({ email: emailProp }: { email: string }) {
  const t = useTranslations('login.checkEmail.otp')
  const router = useRouter()
  // L'email vient du formulaire précédent (?email=…). Accès direct à la page sans
  // email → on affiche aussi un champ email (jamais d'état bloquant silencieux).
  const [email, setEmail] = useState(emailProp)
  const [code, setCode] = useState('')
  // Client browser partagé via le provider du layout (auth) — l'import direct du
  // barrel @evolve/data tirerait googleapis (server-only) dans le bundle client.
  const supabase = useSupabase()

  const mutation = useMutation({
    mutationFn: () => verifyEmailOtp(supabase.auth, email, code),
    onSuccess: (result) => {
      // Session posée côté client (cookies @supabase/ssr) : le middleware/guard
      // onboarding fait le reste depuis /dashboard.
      if (result.ok) router.replace('/dashboard')
    },
  })

  const result = mutation.data
  const failed = result && !result.ok ? result : undefined
  const succeeded = result?.ok === true
  const canSubmit =
    isCompleteOtpCode(code) && EMAIL_RE.test(email) && !mutation.isPending && !succeeded

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (canSubmit) mutation.mutate()
  }

  return (
    <form onSubmit={submit} noValidate className="mt-8 border-t border-border pt-6 text-left">
      <p className="text-center font-mono text-[11px] uppercase tracking-[0.1em] text-text-ter">
        {t('divider')}
      </p>
      <h2 className="mt-3 text-center font-display text-[16px] font-bold text-text">
        {t('title')}
      </h2>
      <p className="mt-1 text-center font-body text-[13px] leading-relaxed text-text-sec">
        {t('hint')}
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {/* Champ email seulement si l'adresse n'est pas connue (accès direct). */}
        {!emailProp && (
          <FormField label={t('emailLabel')} required>
            {(a11y) => (
              <Input
                {...a11y}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            )}
          </FormField>
        )}

        <FormField label={t('codeLabel')} required>
          {(a11y) => (
            <Input
              {...a11y}
              // Un SEUL input (pas 6 cases) : inputMode + one-time-code laissent
              // iOS proposer l'auto-remplissage du code reçu par email/SMS.
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={OTP_CODE_LENGTH}
              placeholder={t('codePlaceholder')}
              value={code}
              onChange={(e) => setCode(sanitizeOtpCode(e.target.value))}
              className="h-11 text-center font-mono text-[20px] font-bold tracking-[0.4em] md:text-[20px]"
            />
          )}
        </FormField>

        <Button type="submit" size="lg" disabled={!canSubmit} isLoading={mutation.isPending}>
          {mutation.isPending ? t('submitting') : t('submit')}
        </Button>
      </div>

      {/* Statut accessible : erreur explicite (code invalide/expiré vs générique)
          ou confirmation de connexion — jamais d'échec silencieux. */}
      <p aria-live="polite" role="status" className="mt-3 min-h-5 text-center">
        {failed && (
          <span className="font-body text-[12px] text-data-negative">{t(failed.errorKey)}</span>
        )}
        {succeeded && <span className="font-body text-[12px] text-text-sec">{t('success')}</span>}
      </p>
    </form>
  )
}
