'use client'
// Écran de connexion — split-panel desktop (F7), fidèle à la réf
// `Login & Onboarding - Desktop-standalone.html` :
//   - panneau gauche MARQUE, toujours sombre (scope `data-theme="dark"`),
//   - panneau droit FORMULAIRE thémé (clair/sombre via ThemeToggle) + réassurance.
// Mobile : seul le panneau formulaire s'affiche (logo en tête).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMutation } from '@tanstack/react-query'
import { Logo, Button, Input, FormField, ThemeToggle, Icon } from '@evolve/ui'
import { requestMagicLink } from '@/lib/api/auth'
import { LocaleSwitcherClient } from '@/components/i18n/LocaleSwitcherClient'
import { BrandDataviz } from '@/components/auth/BrandDataviz'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Lien d'aide → site vitrine public (existant). i18n-ready (copy FR par défaut).
const HELP_URL = 'https://reseauevolvecapital.com'
// Logo de marque servi par l'app.
const LOGO_SRC = '/logo.jpg'

// Panneau marque TOUJOURS sombre : on utilise les tokens NEUTRES (`--n-*`, non
// surchargés par le mode sombre) plutôt que les tokens sémantiques — un scope
// `data-theme="dark"` imbriqué ne marche pas (les alias `@theme` sont résolus
// à :root, donc la surcharge sombre ne se propage pas via l'alias).
function BrandStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-display text-[22px] font-bold leading-none text-neutral-50">
        {value}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
    </div>
  )
}

export function LoginScreen() {
  const t = useTranslations('login')
  const tc = useTranslations('common')
  const tErr = useTranslations('errors.nav')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [clientError, setClientError] = useState<string | undefined>()

  const mutation = useMutation({
    // Message de repli traduit passé à requestMagicLink (module non-React → pas de hook i18n).
    mutationFn: (value: string) => requestMagicLink(value, tErr('requestFailed')),
    onSuccess: () => router.push(`/login/check-email?email=${encodeURIComponent(email)}`),
  })

  const isLoading = mutation.isPending
  // On surface le message d'erreur réel du serveur (ex. « … n'est pas encore invité »)
  // plutôt qu'un message générique — comportement repris de l'ancien AuthCard.
  const errorMessage =
    clientError ?? (mutation.error instanceof Error ? mutation.error.message : undefined)

  function submit() {
    setClientError(undefined)
    if (!EMAIL_RE.test(email)) {
      setClientError(t('form.invalidEmail'))
      return
    }
    mutation.mutate(email)
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto bg-card md:flex-row">
      {/* Panneau marque — TOUJOURS sombre (tokens neutres, indépendants du thème) */}
      <aside className="relative hidden flex-col justify-between bg-neutral-1000 p-10 text-neutral-50 md:flex md:w-[44%] lg:w-[40%] lg:p-12">
        <div className="flex flex-col gap-9">
          <Logo variant="full" src={LOGO_SRC} />
          <div className="flex flex-col gap-5">
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-brand-yellow">
              {t('brand.eyebrow')}
            </p>
            <h1 className="font-display text-[38px] font-bold leading-[1.06] text-neutral-50 lg:text-[44px]">
              {t('brand.headlineLead')}{' '}
              <span className="box-decoration-clone bg-brand-yellow px-1.5 text-neutral-900">
                {t('brand.headlineHighlight')}
              </span>
            </h1>
            <p className="max-w-[44ch] text-[15px] leading-relaxed text-neutral-400">
              {t('brand.tagline')}
            </p>
          </div>
          <BrandDataviz ariaLabel={t('brand.datavizLabel')} />
        </div>
        <div className="flex gap-10">
          <BrandStat value="4" label={t('brand.stats.clubs')} />
          <BrandStat value="48" label={t('brand.stats.members')} />
          <BrandStat value="1,2 M€" label={t('brand.stats.aum')} />
        </div>
      </aside>

      {/* Panneau formulaire — thémé */}
      <main className="flex flex-1 flex-col px-6 py-6 md:px-12 lg:px-20">
        {/* Mobile : groupe toggles à gauche + « Besoin d'aide » à droite (space-between).
            Desktop (md+) : tout aligné à droite. */}
        <div className="flex items-center justify-between gap-3 md:justify-end">
          <div className="flex items-center gap-3">
            <LocaleSwitcherClient />
            <ThemeToggle
              toggleLabel={t('themeToggle.toggle')}
              switchToLightLabel={t('themeToggle.switchToLight')}
              switchToDarkLabel={t('themeToggle.switchToDark')}
            />
          </div>
          <a
            href={HELP_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded px-1 text-[13px] text-text-sec transition-colors hover:text-text focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
          >
            {t('help.link')}
          </a>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-[420px]">
            <Logo variant="full" src={LOGO_SRC} className="mb-8 md:hidden" />

            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-text-ter">
              {t('form.eyebrow')}
            </p>
            <h2 className="mt-3 font-display text-[34px] font-bold leading-tight text-text">
              {t('form.title')}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-text-sec">{t('form.subtitle')}</p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
              noValidate
              className="mt-7 flex flex-col gap-4"
            >
              <FormField label={t('form.emailLabel')} error={errorMessage}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    type="email"
                    autoComplete="email"
                    placeholder={t('form.emailPlaceholder')}
                    value={email}
                    disabled={isLoading}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </FormField>
              {/* A4 — feedback explicite pendant l'aller-retour réseau (~1-2s).
                  On n'utilise PAS `isLoading` (qui masque le label au profit d'un
                  spinner seul) : on rend spinner + texte « Envoi du lien… » côte à
                  côte pour lever toute ambiguïté, et on pilote l'état désactivé +
                  `aria-busy` à la main. */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isLoading}
                aria-busy={isLoading || undefined}
                iconLeft={
                  isLoading ? (
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      className="h-4 w-4 animate-spin motion-reduce:animate-none"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="opacity-25"
                      />
                      <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : undefined
                }
                className="w-full"
              >
                {isLoading ? t('form.submitting') : t('form.submit')}
              </Button>
            </form>

            {/* A4 — statut annoncé aux lecteurs d'écran + visible : zéro ambiguïté
                pendant l'envoi. En idle, on garde le texte de réassurance. */}
            <p
              className="mt-3 text-center text-[13px] text-text-ter"
              aria-live="polite"
              aria-atomic="true"
            >
              {isLoading ? t('form.submittingHint') : t('form.reassurance')}
            </p>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[12px] text-text-ter">{tc('or')}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              disabled
              aria-disabled="true"
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border border-border px-4 py-3 text-[14px] font-semibold text-text-ter opacity-70"
            >
              <Icon name="KeyRound" size={20} aria-hidden="true" />
              {t('passkey.label')}
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-text-ter">
                {t('passkey.badge')}
              </span>
            </button>

            <p className="mt-6 text-center text-[13px] text-text-sec">
              {t('invite.text')}{' '}
              <a
                href={HELP_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded font-semibold text-text underline-offset-2 hover:underline focus:outline-none focus-visible:shadow-[var(--sh-glow)]"
              >
                {t('invite.link')}
              </a>
              {t('invite.suffix')}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
